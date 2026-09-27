import { EmailSenderError } from '../email-sender-error';
import type { EmailAddress } from '../email-message.types';
import type { SendEmailInput } from '../email-sender.types';

const MAXIMUM_RECIPIENTS = 50;
const MAXIMUM_BODY_BYTES = 1024 * 1024;
const DOT_ATOM =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const DOMAIN_NAME =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const ADDRESS_LITERAL = /^\[(?:IPv6:)?[a-f0-9:.]+\]$/i;

export interface ValidatedSendEmail {
  input: SendEmailInput;
  envelopeRecipients: string[];
}

export function validateSendEmail(
  sender: string,
  input: SendEmailInput,
): ValidatedSendEmail {
  const destinations = [input.to ?? [], input.cc ?? [], input.bcc ?? []];
  const recipients = destinations.flat();

  if (
    recipients.length === 0 ||
    recipients.length > MAXIMUM_RECIPIENTS ||
    !hasBody(input) ||
    exceedsBodyLimit(input) ||
    hasHeaderBreak(input.subject) ||
    !isValidAddress({ name: null, address: sender }) ||
    ![...recipients, ...(input.replyTo ?? [])].every(isValidAddress) ||
    hasDuplicateDestinations(recipients)
  ) {
    throw new EmailSenderError('INVALID_MESSAGE');
  }

  // Copy only contract fields so runtime extras such as Nodemailer's `raw`
  // cannot reach the transport.
  return {
    input: {
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    },
    envelopeRecipients: recipients.map(({ address }) => address),
  };
}

function hasBody(input: SendEmailInput): boolean {
  return (input.text?.length ?? 0) > 0 || (input.html?.length ?? 0) > 0;
}

export function exceedsBodyLimit(
  input: Pick<SendEmailInput, 'text' | 'html'>,
): boolean {
  return (
    Buffer.byteLength(input.text ?? '', 'utf8') +
      Buffer.byteLength(input.html ?? '', 'utf8') >
    MAXIMUM_BODY_BYTES
  );
}

function isValidAddress({ name, address }: EmailAddress): boolean {
  if (
    hasHeaderBreak(name ?? '') ||
    hasHeaderBreak(address) ||
    address.length > 254
  ) {
    return false;
  }

  const separator = address.lastIndexOf('@');
  if (separator <= 0 || separator === address.length - 1) {
    return false;
  }

  const local = address.slice(0, separator);
  const domain = address.slice(separator + 1);
  return (
    local.length <= 64 &&
    DOT_ATOM.test(local) &&
    (DOMAIN_NAME.test(domain) || ADDRESS_LITERAL.test(domain))
  );
}

function hasDuplicateDestinations(recipients: EmailAddress[]): boolean {
  const addresses = recipients.map(({ address }) => address.toLowerCase());
  return new Set(addresses).size !== addresses.length;
}

function hasHeaderBreak(value: string | undefined): boolean {
  return value?.includes('\r') === true || value?.includes('\n') === true;
}
