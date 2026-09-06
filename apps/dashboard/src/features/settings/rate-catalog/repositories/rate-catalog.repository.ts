import 'server-only';

import type { Db } from '@inbox-triage/db/client';
import {
  addonRateItems,
  crewRateItems,
  deliverableRateItems,
} from '@inbox-triage/db/schema';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { getPostgresErrorWithCode } from '@/server/postgres-error';
import type { AddonRateItemDto } from '../dto/addon-rate-item.dto';
import { toAddonRateItemDto } from '../dto/addon-rate-item.dto';
import type { CrewRateItemDto } from '../dto/crew-rate-item.dto';
import type { DeliverableRateItemDto } from '../dto/deliverable-rate-item.dto';
import type { RateItemDto } from '../dto/rate-item.dto';
import type { AddonRateItemInput } from '../validation/addon-rate-item-input.schema';
import type { RateCatalog } from '../validation/catalog.schema';
import type { CrewRateItemInput } from '../validation/crew-rate-item-input.schema';
import type { DeliverableRateItemInput } from '../validation/deliverable-rate-item-input.schema';
import {
  CatalogItemNotFoundError,
  CatalogNameConflictError,
} from '../errors/catalog.errors';

type Transaction = Parameters<Parameters<Db['transaction']>[0]>[0];
type DatabaseExecutor = Db | Transaction;

export type RateCatalogRepositoryOptions = {
  tx?: Transaction;
};

export type AdminCatalogLists = {
  crew: CrewRateItemDto[];
  deliverables: DeliverableRateItemDto[];
  addons: AddonRateItemDto[];
};

const NAME_CONSTRAINTS = new Set([
  'crew_rate_items_name_unique',
  'deliverable_rate_items_name_unique',
  'addon_rate_items_name_unique',
]);

const crewSelection = {
  id: crewRateItems.id,
  name: crewRateItems.name,
  dayRateCents: crewRateItems.dayRateCents,
  isActive: crewRateItems.isActive,
  sortOrder: crewRateItems.sortOrder,
};

const deliverableSelection = {
  id: deliverableRateItems.id,
  name: deliverableRateItems.name,
  pricingMode: deliverableRateItems.pricingMode,
  unitPriceCents: deliverableRateItems.unitPriceCents,
  isActive: deliverableRateItems.isActive,
  sortOrder: deliverableRateItems.sortOrder,
};

const addonSelection = {
  id: addonRateItems.id,
  name: addonRateItems.name,
  pricingMode: addonRateItems.pricingMode,
  priceCents: addonRateItems.priceCents,
  percentage: addonRateItems.percentage,
  isActive: addonRateItems.isActive,
  sortOrder: addonRateItems.sortOrder,
};

/**
 * Identifies PostgreSQL unique-constraint violations caused by duplicate names
 * in a rate catalog, while leaving unrelated uniqueness errors untouched.
 */
function isCatalogNameConflict(error: unknown): boolean {
  const postgresError = getPostgresErrorWithCode(error, '23505');

  return (
    postgresError !== undefined &&
    'constraint_name' in postgresError &&
    typeof postgresError.constraint_name === 'string' &&
    NAME_CONSTRAINTS.has(postgresError.constraint_name)
  );
}

function translateCatalogWriteError(error: unknown): never {
  if (isCatalogNameConflict(error)) {
    throw new CatalogNameConflictError();
  }

  throw error;
}

class RateCatalogRepository {
  constructor(private readonly database: Db) {}

  async getAdminLists(
    options: RateCatalogRepositoryOptions = {},
  ): Promise<AdminCatalogLists> {
    const database = options.tx ?? this.database;
    const [crew, deliverables, addons] = await Promise.all([
      this.selectCrew(database, false),
      this.selectDeliverables(database, false),
      this.selectAddons(database, false),
    ]);

    return { crew, deliverables, addons };
  }

  getActiveCrewItems(
    options: RateCatalogRepositoryOptions = {},
  ): Promise<CrewRateItemDto[]> {
    return this.selectCrew(options.tx ?? this.database, true);
  }

  getActiveDeliverableItems(
    options: RateCatalogRepositoryOptions = {},
  ): Promise<DeliverableRateItemDto[]> {
    return this.selectDeliverables(options.tx ?? this.database, true);
  }

  getActiveAddonItems(
    options: RateCatalogRepositoryOptions = {},
  ): Promise<AddonRateItemDto[]> {
    return this.selectAddons(options.tx ?? this.database, true);
  }

  /**
   * Creates a crew item at the end of the catalog. Existing sort orders are
   * compacted first so deletions or stale values cannot leave gaps.
   */
  async createCrewItem(
    input: CrewRateItemInput,
    options: RateCatalogRepositoryOptions = {},
  ): Promise<CrewRateItemDto> {
    try {
      const database = options.tx ?? this.database;
      const ids = await this.selectOrderedIds(database, 'crew');
      await this.assignSortOrders(database, 'crew', ids);
      const [created] = await database
        .insert(crewRateItems)
        .values({ ...input, sortOrder: ids.length })
        .returning(crewSelection);
      if (!created) throw new Error('Catalog insert returned no row.');
      return created;
    } catch (error) {
      translateCatalogWriteError(error);
    }
  }

  /**
   * Creates a deliverable at the end of the catalog. Existing sort orders are
   * compacted first so deletions or stale values cannot leave gaps.
   */
  async createDeliverableItem(
    input: DeliverableRateItemInput,
    options: RateCatalogRepositoryOptions = {},
  ): Promise<DeliverableRateItemDto> {
    try {
      const database = options.tx ?? this.database;
      const ids = await this.selectOrderedIds(database, 'deliverable');
      await this.assignSortOrders(database, 'deliverable', ids);
      const [created] = await database
        .insert(deliverableRateItems)
        .values({ ...input, sortOrder: ids.length })
        .returning(deliverableSelection);
      if (!created) throw new Error('Catalog insert returned no row.');
      return created;
    } catch (error) {
      translateCatalogWriteError(error);
    }
  }

  /**
   * Creates an add-on at the end of the catalog. Existing sort orders are
   * compacted first so deletions or stale values cannot leave gaps.
   */
  async createAddonItem(
    input: AddonRateItemInput,
    options: RateCatalogRepositoryOptions = {},
  ): Promise<AddonRateItemDto> {
    try {
      const database = options.tx ?? this.database;
      const ids = await this.selectOrderedIds(database, 'addon');
      await this.assignSortOrders(database, 'addon', ids);
      const [created] = await database
        .insert(addonRateItems)
        .values({ ...input, sortOrder: ids.length })
        .returning(addonSelection);
      if (!created) throw new Error('Catalog insert returned no row.');
      return toAddonRateItemDto(created);
    } catch (error) {
      translateCatalogWriteError(error);
    }
  }

  async updateCrewItem(
    id: string,
    input: CrewRateItemInput,
    options: RateCatalogRepositoryOptions = {},
  ): Promise<CrewRateItemDto> {
    try {
      const [updated] = await (options.tx ?? this.database)
        .update(crewRateItems)
        .set(input)
        .where(eq(crewRateItems.id, id))
        .returning(crewSelection);
      if (!updated) throw new CatalogItemNotFoundError();
      return updated;
    } catch (error) {
      translateCatalogWriteError(error);
    }
  }

  async updateDeliverableItem(
    id: string,
    input: DeliverableRateItemInput,
    options: RateCatalogRepositoryOptions = {},
  ): Promise<DeliverableRateItemDto> {
    try {
      const [updated] = await (options.tx ?? this.database)
        .update(deliverableRateItems)
        .set(input)
        .where(eq(deliverableRateItems.id, id))
        .returning(deliverableSelection);
      if (!updated) throw new CatalogItemNotFoundError();
      return updated;
    } catch (error) {
      translateCatalogWriteError(error);
    }
  }

  async updateAddonItem(
    id: string,
    input: AddonRateItemInput,
    options: RateCatalogRepositoryOptions = {},
  ): Promise<AddonRateItemDto> {
    try {
      const [updated] = await (options.tx ?? this.database)
        .update(addonRateItems)
        .set(input)
        .where(eq(addonRateItems.id, id))
        .returning(addonSelection);
      if (!updated) throw new CatalogItemNotFoundError();
      return toAddonRateItemDto(updated);
    } catch (error) {
      translateCatalogWriteError(error);
    }
  }

  async setItemActive(
    catalog: RateCatalog,
    id: string,
    isActive: boolean,
    options: RateCatalogRepositoryOptions = {},
  ): Promise<RateItemDto> {
    const database = options.tx ?? this.database;
    switch (catalog) {
      case 'crew': {
        const [updated] = await database
          .update(crewRateItems)
          .set({ isActive })
          .where(eq(crewRateItems.id, id))
          .returning(crewSelection);
        if (!updated) throw new CatalogItemNotFoundError();
        return updated;
      }
      case 'deliverable': {
        const [updated] = await database
          .update(deliverableRateItems)
          .set({ isActive })
          .where(eq(deliverableRateItems.id, id))
          .returning(deliverableSelection);
        if (!updated) throw new CatalogItemNotFoundError();
        return updated;
      }
      case 'addon': {
        const [updated] = await database
          .update(addonRateItems)
          .set({ isActive })
          .where(eq(addonRateItems.id, id))
          .returning(addonSelection);
        if (!updated) throw new CatalogItemNotFoundError();
        return toAddonRateItemDto(updated);
      }
    }
  }

  /**
   * Replaces a catalog's display order by assigning each supplied ID its array
   * index. Callers can supply a transaction to make the updates and final read
   * atomic.
   */
  async replaceCatalogOrder(
    catalog: RateCatalog,
    orderedIds: readonly string[],
    options: RateCatalogRepositoryOptions = {},
  ): Promise<RateItemDto[]> {
    const database = options.tx ?? this.database;
    await this.assignSortOrders(database, catalog, orderedIds);
    return this.selectCatalog(database, catalog);
  }

  /**
   * Returns every catalog ID in display order. IDs break ties between duplicate
   * sort orders so subsequent reassignment remains deterministic.
   */
  getOrderedIds(
    catalog: RateCatalog,
    options: RateCatalogRepositoryOptions = {},
  ) {
    return this.selectOrderedIds(options.tx ?? this.database, catalog);
  }

  private async selectOrderedIds(
    database: DatabaseExecutor,
    catalog: RateCatalog,
  ) {
    switch (catalog) {
      case 'crew':
        return (
          await database
            .select({ id: crewRateItems.id })
            .from(crewRateItems)
            .orderBy(asc(crewRateItems.sortOrder), asc(crewRateItems.id))
        ).map(({ id }) => id);
      case 'deliverable':
        return (
          await database
            .select({ id: deliverableRateItems.id })
            .from(deliverableRateItems)
            .orderBy(
              asc(deliverableRateItems.sortOrder),
              asc(deliverableRateItems.id),
            )
        ).map(({ id }) => id);
      case 'addon':
        return (
          await database
            .select({ id: addonRateItems.id })
            .from(addonRateItems)
            .orderBy(asc(addonRateItems.sortOrder), asc(addonRateItems.id))
        ).map(({ id }) => id);
    }
  }

  /**
   * Reads crew in display order, optionally excluding inactive rows. The ID
   * tie-breaker keeps results stable if multiple rows share a sort order.
   */
  private selectCrew(database: DatabaseExecutor, activeOnly: boolean) {
    return database
      .select(crewSelection)
      .from(crewRateItems)
      .where(activeOnly ? eq(crewRateItems.isActive, true) : undefined)
      .orderBy(asc(crewRateItems.sortOrder), asc(crewRateItems.id));
  }

  /**
   * Reads deliverables in display order, optionally excluding inactive rows.
   * The ID tie-breaker keeps duplicate sort orders deterministic.
   */
  private selectDeliverables(database: DatabaseExecutor, activeOnly: boolean) {
    return database
      .select(deliverableSelection)
      .from(deliverableRateItems)
      .where(activeOnly ? eq(deliverableRateItems.isActive, true) : undefined)
      .orderBy(
        asc(deliverableRateItems.sortOrder),
        asc(deliverableRateItems.id),
      );
  }

  /**
   * Reads add-ons in stable display order, optionally excluding inactive rows,
   * then converts each database row into its validated pricing DTO shape.
   */
  private async selectAddons(database: DatabaseExecutor, activeOnly: boolean) {
    const rows = await database
      .select(addonSelection)
      .from(addonRateItems)
      .where(activeOnly ? eq(addonRateItems.isActive, true) : undefined)
      .orderBy(asc(addonRateItems.sortOrder), asc(addonRateItems.id));

    return rows.map(toAddonRateItemDto);
  }

  /**
   * Writes one row's sort order in the selected catalog and advances its
   * update timestamp so reordering is recorded as a lifecycle change.
   */
  private async setItemSortOrder(
    database: DatabaseExecutor,
    catalog: RateCatalog,
    id: string,
    sortOrder: number,
  ) {
    switch (catalog) {
      case 'crew':
        await database
          .update(crewRateItems)
          .set({ sortOrder })
          .where(eq(crewRateItems.id, id));
        break;
      case 'deliverable':
        await database
          .update(deliverableRateItems)
          .set({ sortOrder })
          .where(eq(deliverableRateItems.id, id));
        break;
      case 'addon':
        await database
          .update(addonRateItems)
          .set({ sortOrder })
          .where(eq(addonRateItems.id, id));
        break;
    }
  }

  /**
   * Assigns dense, zero-based sort orders in the exact order supplied. This
   * removes gaps and duplicates without changing the requested order.
   */
  private async assignSortOrders(
    database: DatabaseExecutor,
    catalog: RateCatalog,
    orderedIds: readonly string[],
  ) {
    for (const [sortOrder, id] of orderedIds.entries()) {
      await this.setItemSortOrder(database, catalog, id, sortOrder);
    }
  }

  /**
   * Reads the complete catalog after a write. Add-ons also pass through their
   * pricing-shape DTO conversion.
   */
  private async selectCatalog(
    database: DatabaseExecutor,
    catalog: RateCatalog,
  ): Promise<RateItemDto[]> {
    switch (catalog) {
      case 'crew':
        return database
          .select(crewSelection)
          .from(crewRateItems)
          .orderBy(asc(crewRateItems.sortOrder), asc(crewRateItems.id));
      case 'deliverable':
        return database
          .select(deliverableSelection)
          .from(deliverableRateItems)
          .orderBy(
            asc(deliverableRateItems.sortOrder),
            asc(deliverableRateItems.id),
          );
      case 'addon':
        return (
          await database
            .select(addonSelection)
            .from(addonRateItems)
            .orderBy(asc(addonRateItems.sortOrder), asc(addonRateItems.id))
        ).map(toAddonRateItemDto);
    }
  }
}

export const rateCatalogRepository = new RateCatalogRepository(db);
