import { EmailClientError } from '../email-client-error';

export interface PageTokenValue {
  uidValidity: bigint;
  beforeUid: number;
}

export function createPageToken(value: PageTokenValue): string {
  return Buffer.from(
    JSON.stringify({
      v: 1,
      mailbox: 'INBOX',
      uidValidity: value.uidValidity.toString(),
      beforeUid: value.beforeUid,
    }),
  ).toString('base64url');
}

export function parsePageToken(token: string): PageTokenValue {
  try {
    if (!token || token.length > 1_024 || !/^[A-Za-z0-9_-]+$/.test(token)) {
      throw new Error();
    }

    const value: unknown = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf8'),
    );
    if (
      !isRecord(value) ||
      Object.keys(value).sort().join(',') !== PAGE_TOKEN_KEYS.join(',') ||
      value.v !== 1 ||
      value.mailbox !== 'INBOX' ||
      typeof value.uidValidity !== 'string' ||
      !/^[1-9]\d*$/.test(value.uidValidity) ||
      !Number.isSafeInteger(value.beforeUid) ||
      Number(value.beforeUid) <= 1
    ) {
      throw new Error();
    }

    return {
      uidValidity: BigInt(value.uidValidity),
      beforeUid: Number(value.beforeUid),
    };
  } catch {
    throw new EmailClientError('INVALID_PAGE_TOKEN');
  }
}

const PAGE_TOKEN_KEYS = ['beforeUid', 'mailbox', 'uidValidity', 'v'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
