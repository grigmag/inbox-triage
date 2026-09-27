import type { EmailAddressDto } from '../dto/email.dto';

export function formatEmailAddresses(values: EmailAddressDto[]): string {
  return values
    .map(({ name, address }) => (name ? `${name} <${address}>` : address))
    .join(', ');
}
