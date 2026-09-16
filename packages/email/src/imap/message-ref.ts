import { EmailClientError } from '../email-client-error';

interface MessageRefValue {
  uidValidity: bigint;
  uid: number;
}

export function createMessageRef(value: MessageRefValue): string {
  return encode({
    v: 1,
    mailbox: 'INBOX',
    uidValidity: value.uidValidity.toString(),
    uid: value.uid,
  });
}

export function parseMessageRef(ref: string): MessageRefValue {
  try {
    const value: unknown = decode(ref);
    if (!isRecord(value) || !hasOnlyKeys(value, REF_KEYS)) {
      throw new Error();
    }
    if (
      value.v !== 1 ||
      value.mailbox !== 'INBOX' ||
      !isPositiveIntegerString(value.uidValidity) ||
      !isPositiveInteger(value.uid)
    ) {
      throw new Error();
    }

    return {
      uidValidity: BigInt(value.uidValidity),
      uid: value.uid,
    };
  } catch {
    throw new EmailClientError('INVALID_MESSAGE_REF');
  }
}

const REF_KEYS = ['mailbox', 'uid', 'uidValidity', 'v'];

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value: string): unknown {
  if (!value || value.length > 1_024 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error();
  }

  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join(',') === keys.join(',');
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isPositiveIntegerString(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value);
}
