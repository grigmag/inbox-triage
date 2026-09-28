import type { EmailAddressDto } from '../dto/email.dto';

const LETTER = /\p{L}/u;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

/**
 * Returns up to two initials for an avatar: the first letters of the first and
 * last words of the name, or the first letter of the address when the name has
 * none. Never returns an empty string.
 */
export function getSenderInitials({ name, address }: EmailAddressDto): string {
  const nameInitials = (name ?? '')
    .split(/\s+/)
    .map((word) => LETTER.exec(word)?.[0])
    .filter((letter) => letter !== undefined);

  if (nameInitials.length > 0) {
    const first = nameInitials[0];
    const last = nameInitials.length > 1 ? nameInitials.at(-1) : '';

    return `${first}${last}`.toUpperCase();
  }

  return LETTER_OR_NUMBER.exec(address)?.[0].toUpperCase() ?? '?';
}
