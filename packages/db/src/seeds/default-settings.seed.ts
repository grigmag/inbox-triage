import type { Db } from '../client';
import { addonRateItems, crewRateItems, deliverableRateItems } from '../schema';
import { sql } from 'drizzle-orm';
import {
  DEFAULT_ADDON_RATE_ITEMS,
  DEFAULT_CREW_RATE_ITEMS,
  DEFAULT_DELIVERABLE_RATE_ITEMS,
} from './default-settings';

type Transaction = Parameters<Parameters<Db['transaction']>[0]>[0];

type SeedableDefault = {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
};

type CatalogStateRow = {
  id: string;
  normalizedName: string;
  sortOrder: number;
};

type CatalogSeedSummary = {
  inserted: string[];
  preserved: string[];
  skipped: string[];
};

export type DefaultSettingsSeedSummary = {
  crew: CatalogSeedSummary;
  deliverables: CatalogSeedSummary;
  addons: CatalogSeedSummary;
};

type CatalogClassification<T extends SeedableDefault> = {
  eligible: T[];
  preserved: string[];
  skipped: string[];
};

function classifyDefaults<T extends SeedableDefault>(
  defaults: readonly T[],
  existingRows: readonly CatalogStateRow[],
): CatalogClassification<T> {
  const existingIds = new Set(existingRows.map(({ id }) => id));
  const existingNames = new Set(
    existingRows.map(({ normalizedName }) => normalizedName),
  );
  const eligible: T[] = [];
  const preserved: string[] = [];
  const skipped: string[] = [];

  for (const item of defaults) {
    if (existingIds.has(item.id)) {
      preserved.push(item.name);
    } else if (existingNames.has(item.name.toLowerCase())) {
      skipped.push(item.name);
    } else {
      eligible.push(item);
    }
  }

  return { eligible, preserved, skipped };
}

async function seedCatalog<T extends SeedableDefault>(options: {
  defaults: readonly T[];
  readState: () => Promise<CatalogStateRow[]>;
  insert: (items: (T & { sortOrder: number })[]) => Promise<{ id: string }[]>;
}): Promise<CatalogSeedSummary> {
  // Classify defaults against the current catalog state.
  const existingRows = await options.readState();
  const { eligible, preserved, skipped } = classifyDefaults(
    options.defaults,
    existingRows,
  );

  // Append eligible defaults after the highest existing sort order.
  const firstSortOrder =
    existingRows.reduce(
      (highest, { sortOrder }) => Math.max(highest, sortOrder),
      -1,
    ) + 1;
  const pendingItems = eligible.map((item, index) => ({
    ...item,
    sortOrder: firstSortOrder + index,
  }));

  const insertedRows =
    pendingItems.length === 0 ? [] : await options.insert(pendingItems);
  const insertedIds = new Set(insertedRows.map(({ id }) => id));
  const inserted = eligible
    .filter(({ id }) => insertedIds.has(id))
    .map(({ name }) => name);
  const defensiveNoops = eligible.filter(({ id }) => !insertedIds.has(id));

  // Reconcile inserts suppressed by defensive conflict handling.
  if (defensiveNoops.length > 0) {
    const finalRows = await options.readState();
    const reconciled = classifyDefaults(defensiveNoops, finalRows);

    if (reconciled.eligible.length > 0) {
      throw new Error('A settings default could not be inserted.');
    }

    preserved.push(...reconciled.preserved);
    skipped.push(...reconciled.skipped);
  }

  return { inserted, preserved, skipped };
}

export async function seedDefaultSettings(
  db: Db,
): Promise<DefaultSettingsSeedSummary> {
  return db.transaction(async (tx) => ({
    crew: await seedCrewDefaults(tx),
    deliverables: await seedDeliverableDefaults(tx),
    addons: await seedAddonDefaults(tx),
  }));
}

function seedCrewDefaults(tx: Transaction) {
  return seedCatalog({
    defaults: DEFAULT_CREW_RATE_ITEMS,
    readState: () =>
      tx
        .select({
          id: crewRateItems.id,
          normalizedName: sql<string>`lower(${crewRateItems.name})`,
          sortOrder: crewRateItems.sortOrder,
        })
        .from(crewRateItems),
    insert: (items) =>
      tx
        .insert(crewRateItems)
        .values(items)
        .onConflictDoNothing()
        .returning({ id: crewRateItems.id }),
  });
}

function seedDeliverableDefaults(tx: Transaction) {
  return seedCatalog({
    defaults: DEFAULT_DELIVERABLE_RATE_ITEMS,
    readState: () =>
      tx
        .select({
          id: deliverableRateItems.id,
          normalizedName: sql<string>`lower(${deliverableRateItems.name})`,
          sortOrder: deliverableRateItems.sortOrder,
        })
        .from(deliverableRateItems),
    insert: (items) =>
      tx
        .insert(deliverableRateItems)
        .values(items)
        .onConflictDoNothing()
        .returning({ id: deliverableRateItems.id }),
  });
}

function seedAddonDefaults(tx: Transaction) {
  return seedCatalog({
    defaults: DEFAULT_ADDON_RATE_ITEMS,
    readState: () =>
      tx
        .select({
          id: addonRateItems.id,
          normalizedName: sql<string>`lower(${addonRateItems.name})`,
          sortOrder: addonRateItems.sortOrder,
        })
        .from(addonRateItems),
    insert: (items) =>
      tx
        .insert(addonRateItems)
        .values(items)
        .onConflictDoNothing()
        .returning({ id: addonRateItems.id }),
  });
}
