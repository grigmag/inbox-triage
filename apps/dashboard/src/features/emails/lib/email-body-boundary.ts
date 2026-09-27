/**
 * Returns a boundary name that does not occur in the email body, so untrusted
 * content cannot fake the end marker and place injected text outside the
 * delimited block. Instructions written inside the body are handled by the
 * system prompt rules, not by this boundary.
 */
export function emailBodyBoundary(body: string): string {
  let boundary = 'INBOX_TRIAGE_EMAIL_BODY';

  while (body.includes(boundary)) {
    boundary += '_';
  }

  return boundary;
}
