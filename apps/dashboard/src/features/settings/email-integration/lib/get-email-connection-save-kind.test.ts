import { describe, expect, it } from 'vitest';
import { getEmailConnectionSaveKind } from './get-email-connection-save-kind';

const zoho = {
  provider: 'zoho',
  username: 'studio@example.com',
  imapHost: 'imap.zoho.com',
  smtpHost: 'smtp.zoho.com',
} as const;
const gmail = { provider: 'gmail', username: 'studio@example.com' } as const;

describe('getEmailConnectionSaveKind', () => {
  it('creates a connection when none is saved', () => {
    expect(
      getEmailConnectionSaveKind(null, {
        provider: 'gmail',
        email: 'studio@example.com',
        password: '',
      }),
    ).toBe('create');
  });

  it('treats the same provider, username, and hosts without a password as unchanged', () => {
    expect(
      getEmailConnectionSaveKind(zoho, {
        provider: 'zoho',
        email: zoho.username,
        imapHost: zoho.imapHost,
        smtpHost: zoho.smtpHost,
        password: '',
      }),
    ).toBe('none');
    expect(
      getEmailConnectionSaveKind(gmail, {
        provider: 'gmail',
        email: gmail.username,
        password: '',
      }),
    ).toBe('none');
  });

  it('updates the same provider when the username, a host, or the password changes', () => {
    expect(
      getEmailConnectionSaveKind(gmail, {
        provider: 'gmail',
        email: 'other@example.com',
        password: '',
      }),
    ).toBe('update');
    expect(
      getEmailConnectionSaveKind(zoho, {
        provider: 'zoho',
        email: zoho.username,
        imapHost: zoho.imapHost,
        smtpHost: 'smtp.zoho.eu',
        password: '',
      }),
    ).toBe('update');
    expect(
      getEmailConnectionSaveKind(gmail, {
        provider: 'gmail',
        email: gmail.username,
        password: 'abcdefghijklmnop',
      }),
    ).toBe('update');
  });

  it('replaces a connection with another provider even when nothing else changed', () => {
    expect(
      getEmailConnectionSaveKind(zoho, {
        provider: 'gmail',
        email: zoho.username,
        password: '',
      }),
    ).toBe('replace');
    expect(
      getEmailConnectionSaveKind(gmail, {
        provider: 'zoho',
        email: gmail.username,
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
        password: 'zoho password',
      }),
    ).toBe('replace');
  });
});
