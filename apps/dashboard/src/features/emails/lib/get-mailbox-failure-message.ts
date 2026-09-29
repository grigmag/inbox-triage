/** The message to show for a mailbox call that did not succeed. */
export function getMailboxFailureMessage(
  result: { status: 'noConnection' } | { status: string; message: string },
): string {
  return 'message' in result
    ? result.message
    : 'Connect your mailbox in Email settings.';
}
