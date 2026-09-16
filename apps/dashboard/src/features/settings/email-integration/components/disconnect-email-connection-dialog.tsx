'use client';

import { Button } from '@inbox-triage/ui';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { disconnectEmailConnectionAction } from '../actions/disconnect-email-connection.action';

type DisconnectEmailConnectionDialogProps = {
  disabled: boolean;
  onDisconnected: (announcement: string) => void;
  onFailure: (message: string) => void;
};

const FAILURE_MESSAGE =
  'Unable to disconnect the email connection. Please try again.';

export function DisconnectEmailConnectionDialog({
  disabled,
  onDisconnected,
  onFailure,
}: DisconnectEmailConnectionDialogProps) {
  async function handleConfirm() {
    try {
      const result = await disconnectEmailConnectionAction();

      if (result.status === 'success') {
        onDisconnected(result.announcement);
        return;
      }

      onFailure(
        result.status === 'failure' || result.status === 'not_found'
          ? result.message
          : FAILURE_MESSAGE,
      );
    } catch {
      onFailure(FAILURE_MESSAGE);
    }
  }

  return (
    <ConfirmActionDialog
      title="Disconnect email?"
      description="This removes the saved Zoho email credentials from InboxTriage."
      actionLabel="Disconnect"
      cancelLabel="Cancel"
      onConfirm={handleConfirm}
      trigger={
        <Button type="button" variant="destructive" disabled={disabled}>
          Disconnect
        </Button>
      }
    />
  );
}
