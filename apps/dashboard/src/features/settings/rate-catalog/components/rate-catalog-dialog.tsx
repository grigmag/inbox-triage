import type { AddonRateItemDto } from '../dto/addon-rate-item.dto';
import type { CrewRateItemDto } from '../dto/crew-rate-item.dto';
import type { DeliverableRateItemDto } from '../dto/deliverable-rate-item.dto';
import type { RateCatalogDialogState } from '../hooks/use-rate-catalog-editor';
import { AddonRateItemDialog } from './addon-rate-item-dialog';
import { CrewRateItemDialog } from './crew-rate-item-dialog';
import { DeliverableRateItemDialog } from './deliverable-rate-item-dialog';
import type { MutationRunner } from './rate-item-dialog.types';

type RateCatalogDialogProps = {
  dialog: RateCatalogDialogState;
  pending: boolean;
  runMutation: MutationRunner;
  onClose: () => void;
  onCrewSaved: (item: CrewRateItemDto, message: string) => void;
  onDeliverableSaved: (item: DeliverableRateItemDto, message: string) => void;
  onAddonSaved: (item: AddonRateItemDto, message: string) => void;
};

export function RateCatalogDialog({
  dialog,
  pending,
  runMutation,
  onClose,
  onCrewSaved,
  onDeliverableSaved,
  onAddonSaved,
}: RateCatalogDialogProps) {
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (dialog?.catalog === 'crew') {
    return (
      <CrewRateItemDialog
        item={dialog.item}
        open
        pending={pending}
        onOpenChange={onOpenChange}
        onSaved={onCrewSaved}
        runMutation={runMutation}
      />
    );
  }

  if (dialog?.catalog === 'deliverable') {
    return (
      <DeliverableRateItemDialog
        item={dialog.item}
        open
        pending={pending}
        onOpenChange={onOpenChange}
        onSaved={onDeliverableSaved}
        runMutation={runMutation}
      />
    );
  }

  if (dialog?.catalog === 'addon') {
    return (
      <AddonRateItemDialog
        item={dialog.item}
        open
        pending={pending}
        onOpenChange={onOpenChange}
        onSaved={onAddonSaved}
        runMutation={runMutation}
      />
    );
  }

  return null;
}
