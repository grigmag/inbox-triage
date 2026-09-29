'use client';

import { toast } from '@inbox-triage/ui';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { reorderCatalogAction } from '../actions/reorder-catalog.action';
import { setCatalogItemActiveAction } from '../actions/set-catalog-item-active.action';
import type { AddonRateItemDto } from '../dto/addon-rate-item.dto';
import type { CrewRateItemDto } from '../dto/crew-rate-item.dto';
import type { DeliverableRateItemDto } from '../dto/deliverable-rate-item.dto';
import type { RateItemDto } from '../dto/rate-item.dto';
import type { MutationRunner } from '../components/rate-item-dialog.types';
import type { AdminCatalogLists } from '../repositories/rate-catalog.repository';
import {
  isAddonRateItem,
  isCrewRateItem,
  isDeliverableRateItem,
  replaceCatalogItem,
  upsertCatalogItem,
} from '../lib/rate-catalog-list.utils';
import type { RateCatalog } from '../validation/catalog.schema';

export type RateCatalogDialogState =
  | { catalog: 'crew'; item: CrewRateItemDto | null }
  | { catalog: 'deliverable'; item: DeliverableRateItemDto | null }
  | { catalog: 'addon'; item: AddonRateItemDto | null }
  | null;

const CATALOG_NAMES: Record<RateCatalog, string> = {
  crew: 'crew roles',
  deliverable: 'deliverables',
  addon: 'add-ons',
};

export function useRateCatalogEditor(initialCatalogs: AdminCatalogLists) {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState(initialCatalogs);
  const [dialog, setDialog] = useState<RateCatalogDialogState>(null);
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const pendingRef = useRef(false);

  const runMutation: MutationRunner = async (operation) => {
    if (pendingRef.current) return { outcome: 'skipped' };
    pendingRef.current = true;
    setPending(true);
    try {
      const result = await operation();
      return { outcome: 'completed', result };
    } catch {
      return { outcome: 'failed' };
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  function finishSave(message: string) {
    setDialog(null);
    toast.add({ title: message, type: 'success' });
  }

  function saveCrew(item: CrewRateItemDto, message: string) {
    setCatalogs((current) => ({
      ...current,
      crew: upsertCatalogItem(current.crew, item),
    }));
    finishSave(message);
  }

  function saveDeliverable(item: DeliverableRateItemDto, message: string) {
    setCatalogs((current) => ({
      ...current,
      deliverables: upsertCatalogItem(current.deliverables, item),
    }));
    finishSave(message);
  }

  function saveAddon(item: AddonRateItemDto, message: string) {
    setCatalogs((current) => ({
      ...current,
      addons: upsertCatalogItem(current.addons, item),
    }));
    finishSave(message);
  }

  function reportFailure(message: string) {
    toast.add({ title: message, type: 'error' });
    router.refresh();
  }

  async function setActive(
    catalog: RateCatalog,
    item: RateItemDto,
    isActive: boolean,
  ) {
    const failureMessage = `Could not update ${item.name}. Try again.`;
    const run = await runMutation(() =>
      setCatalogItemActiveAction({ catalog, id: item.id, isActive }),
    );

    if (run.outcome === 'skipped') return;
    if (run.outcome === 'failed' || run.result.status !== 'success') {
      reportFailure(failureMessage);
      return;
    }

    const updatedItem = run.result.data;
    setCatalogs((current) => {
      if (catalog === 'crew' && isCrewRateItem(updatedItem)) {
        return {
          ...current,
          crew: replaceCatalogItem(current.crew, updatedItem),
        };
      }
      if (catalog === 'deliverable' && isDeliverableRateItem(updatedItem)) {
        return {
          ...current,
          deliverables: replaceCatalogItem(current.deliverables, updatedItem),
        };
      }
      if (catalog === 'addon' && isAddonRateItem(updatedItem)) {
        return {
          ...current,
          addons: replaceCatalogItem(current.addons, updatedItem),
        };
      }
      return current;
    });
  }

  async function move(
    catalog: RateCatalog,
    items: RateItemDto[],
    index: number,
    direction: -1 | 1,
  ) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const expectedIds = items.map(({ id }) => id);
    const orderedIds = [...expectedIds];
    [orderedIds[index], orderedIds[targetIndex]] = [
      orderedIds[targetIndex]!,
      orderedIds[index]!,
    ];

    const failureMessage = `Could not reorder ${CATALOG_NAMES[catalog]}. The saved order has been restored.`;
    const run = await runMutation(() =>
      reorderCatalogAction({ catalog, expectedIds, orderedIds }),
    );

    if (run.outcome === 'skipped') return;
    if (run.outcome === 'failed' || run.result.status !== 'success') {
      reportFailure(failureMessage);
      return;
    }

    const orderedItems = run.result.data;
    setCatalogs((current) => {
      if (catalog === 'crew' && orderedItems.every(isCrewRateItem)) {
        return { ...current, crew: [...orderedItems] };
      }
      if (
        catalog === 'deliverable' &&
        orderedItems.every(isDeliverableRateItem)
      ) {
        return { ...current, deliverables: [...orderedItems] };
      }
      if (catalog === 'addon' && orderedItems.every(isAddonRateItem)) {
        return { ...current, addons: [...orderedItems] };
      }
      return current;
    });
    setAnnouncement(
      `${items[index]!.name} moved ${direction === -1 ? 'up' : 'down'}.`,
    );
  }

  return {
    catalogs,
    dialog,
    pending,
    announcement,
    runMutation,
    openDialog: setDialog,
    closeDialog: () => setDialog(null),
    saveCrew,
    saveDeliverable,
    saveAddon,
    setActive,
    move,
  };
}
