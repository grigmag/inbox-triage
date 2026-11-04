import type { CompanyProfileDto } from '@/features/settings/company-profile/dto/company-profile.dto';

export type ReplyFooterProfile = Pick<
  CompanyProfileDto,
  'name' | 'email' | 'phone' | 'address' | 'postalCode' | 'city'
>;

/**
 * The footer text, or null when the profile has nothing to show. Lines are the
 * name, contact details and postal address, and blank fields drop out with
 * their separators.
 */
export function formatReplyFooter(profile: ReplyFooterProfile): string | null {
  const name = present(profile.name);
  const contact = joinPresent([profile.phone, profile.email], ' · ');
  const locality = joinPresent([profile.city, profile.postalCode], ' ');
  const address = joinPresent([profile.address, locality], ', ');

  return joinPresent([name, contact, address], '\n');
}

/** Adds the footer below the body, separated by a blank line. */
export function appendReplyFooter({
  body,
  footer,
}: {
  body: string;
  footer: string | null;
}): string {
  return footer === null ? body : `${body}\n\n${footer}`;
}

function joinPresent(
  values: (string | null)[],
  separator: string,
): string | null {
  const parts = values.map(present).filter((value) => value !== null);

  return parts.length > 0 ? parts.join(separator) : null;
}

function present(value: string | null): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
