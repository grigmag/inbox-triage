export type MailboxResult<Data> =
  | { status: 'success'; data: Data }
  | { status: 'noConnection' }
  | { status: 'failure'; message: string };
