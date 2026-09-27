export type GenerateBriefReplyActionResult =
  | { status: 'success'; data: { body: string } }
  | { status: 'noConnection' }
  | { status: 'failure'; message: string };
