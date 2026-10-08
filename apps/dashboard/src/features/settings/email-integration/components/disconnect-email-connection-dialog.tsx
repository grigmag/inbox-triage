'use client';

import { Button } from '@inbox-triage/ui';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { disconnectEmailConnectionAction } from '../actions/disconnect-email-connection.action';

type DisconnectEmailConnectionDialogProps = {
  providerLabel: string;
  username: string;
  disabled: boolean;
  onDisconnected: (announcement: string) => void;
  onFailure: (message: string) => void;
};

const FAILURE_MESSAGE =
  'Unable to disconnect the email connection. Please try again.';

export function DisconnectEmailConnectionDialog({
  providerLabel,
  username,
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
      title={`Disconnect ${providerLabel}?`}
      description={`This removes the saved credentials for ${username} from InboxTriage.`}
      actionLabel="Disconnect"
      cancelLabel="Cancel"
      onConfirm={handleConfirm}
      trigger={
        <Button type="button" variant="destructive" disabled={disabled}>
          Disconnect {providerLabel}
        </Button>
      }
    />
  );
}
