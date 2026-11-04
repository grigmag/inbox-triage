import { describe, expect, it } from 'vitest';
import {
  appendReplyFooter,
  formatReplyFooter,
  type ReplyFooterProfile,
} from './reply-footer.utils';

const emptyProfile: ReplyFooterProfile = {
  name: null,
  email: null,
  phone: null,
  address: null,
  postalCode: null,
  city: null,
};

const fullProfile: ReplyFooterProfile = {
  name: 'Northlight Studio',
  email: 'hello@northlight.example',
  phone: '+30 210 1234567',
  address: '12 Ermou Street',
  postalCode: '10563',
  city: 'Athens',
};

describe('formatReplyFooter', () => {
  it('formats a full profile as name, contact and address lines', () => {
    expect(formatReplyFooter(fullProfile)).toBe(
      'Northlight Studio\n+30 210 1234567 · hello@northlight.example\n12 Ermou Street, Athens 10563',
    );
  });

  it('leaves out blank fields with their separators and lines', () => {
    expect(
      formatReplyFooter({
        ...emptyProfile,
        name: 'Northlight Studio',
        email: 'hello@northlight.example',
      }),
    ).toBe('Northlight Studio\nhello@northlight.example');
  });

  it.each<[string, Partial<ReplyFooterProfile>, string]>([
    ['only the name', { name: 'Northlight Studio' }, 'Northlight Studio'],
    [
      'name and phone',
      { name: 'Northlight Studio', phone: '+30 210 1234567' },
      'Northlight Studio\n+30 210 1234567',
    ],
    [
      'name and address, without contact details',
      { name: 'Northlight Studio', address: '12 Ermou Street', city: 'Athens' },
      'Northlight Studio\n12 Ermou Street, Athens',
    ],
    [
      'contact details and address, without a name',
      {
        email: 'hello@northlight.example',
        phone: '+30 210 1234567',
        city: 'Athens',
        postalCode: '10563',
      },
      '+30 210 1234567 · hello@northlight.example\nAthens 10563',
    ],
    [
      'everything except the street address',
      { ...fullProfile, address: null },
      'Northlight Studio\n+30 210 1234567 · hello@northlight.example\nAthens 10563',
    ],
    [
      'everything except the city',
      { ...fullProfile, city: null },
      'Northlight Studio\n+30 210 1234567 · hello@northlight.example\n12 Ermou Street, 10563',
    ],
    [
      'everything except the postal code',
      { ...fullProfile, postalCode: null },
      'Northlight Studio\n+30 210 1234567 · hello@northlight.example\n12 Ermou Street, Athens',
    ],
    [
      'only the street address',
      { address: '12 Ermou Street' },
      '12 Ermou Street',
    ],
    ['only the city', { city: 'Athens' }, 'Athens'],
    ['only the postal code', { postalCode: '10563' }, '10563'],
    ['only the phone', { phone: '+30 210 1234567' }, '+30 210 1234567'],
  ])('formats a profile with %s', (_, fields, expected) => {
    expect(formatReplyFooter({ ...emptyProfile, ...fields })).toBe(expected);
  });

  it('returns null for an empty profile', () => {
    expect(formatReplyFooter(emptyProfile)).toBeNull();
  });

  it('treats whitespace-only fields as empty', () => {
    expect(
      formatReplyFooter({ ...emptyProfile, name: '  ', city: '\t' }),
    ).toBeNull();
  });

  it('trims fields and drops whitespace-only ones within a filled profile', () => {
    expect(
      formatReplyFooter({
        ...fullProfile,
        name: '  Northlight Studio ',
        phone: ' ',
        city: '\tAthens',
        postalCode: '',
      }),
    ).toBe(
      'Northlight Studio\nhello@northlight.example\n12 Ermou Street, Athens',
    );
  });
});

describe('appendReplyFooter', () => {
  it('adds the footer below the body after a blank line', () => {
    expect(
      appendReplyFooter({ body: 'Kind regards,', footer: 'Northlight Studio' }),
    ).toBe('Kind regards,\n\nNorthlight Studio');
  });

  it('returns the body unchanged without a footer', () => {
    expect(appendReplyFooter({ body: 'Kind regards,', footer: null })).toBe(
      'Kind regards,',
    );
  });
});
