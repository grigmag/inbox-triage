import { describe, expect, it } from 'vitest';
import { getSenderInitials } from './get-sender-initials';

describe('getSenderInitials', () => {
  it('uses the first letters of the first and last words of the name', () => {
    expect(
      getSenderInitials({
        name: 'Maria van der Berg',
        address: 'maria@example.com',
      }),
    ).toBe('MB');
  });

  it('uses one initial for a single-word name', () => {
    expect(
      getSenderInitials({ name: 'triage', address: 'hello@example.com' }),
    ).toBe('T');
  });

  it('supports Greek names', () => {
    expect(
      getSenderInitials({
        name: 'Γιώργος Παπαδόπουλος',
        address: 'g@example.gr',
      }),
    ).toBe('ΓΠ');
    expect(
      getSenderInitials({ name: 'ελένη', address: 'eleni@example.gr' }),
    ).toBe('Ε');
  });

  it('skips punctuation around name words', () => {
    expect(
      getSenderInitials({
        name: '"Anna" (Studio)',
        address: 'anna@example.com',
      }),
    ).toBe('AS');
  });

  it('falls back to the first letter of the address', () => {
    expect(getSenderInitials({ name: null, address: 'bob@example.com' })).toBe(
      'B',
    );
    expect(getSenderInitials({ name: '  ', address: 'bob@example.com' })).toBe(
      'B',
    );
    expect(
      getSenderInitials({ name: '---', address: '_bob@example.com' }),
    ).toBe('B');
  });

  it('never returns an empty string', () => {
    expect(getSenderInitials({ name: null, address: '' })).toBe('?');
  });
});
