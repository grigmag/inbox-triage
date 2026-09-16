import { describe, expect, it, vi } from 'vitest';
import { cryptoService } from './crypto.service';

vi.mock('server-only', () => ({}));
vi.mock('@/server/env', () => ({
  env: {
    APP_ENCRYPTION_KEY: '00'.repeat(32),
    APP_HASHING_KEY: '11'.repeat(32),
  },
}));

describe('CryptoService', () => {
  it('preserves whitespace and Unicode while using a fresh IV each time', () => {
    const password = '  κωδικός 🔑\n';
    const first = cryptoService.encryptAndSignString(password);
    const second = cryptoService.encryptAndSignString(password);

    expect(first).not.toBe(second);
    expect(cryptoService.decryptSignedString(first)).toBe(password);
    expect(cryptoService.decryptSignedString(second)).toBe(password);
  });

  it.each(['ciphertext', 'signature'])('rejects a modified %s', (part) => {
    const password = 'test-password';
    const parts = cryptoService.encryptAndSignString(password).split(':');
    const index = part === 'ciphertext' ? 1 : 2;
    parts[index] =
      (parts[index][0] === '0' ? '1' : '0') + parts[index].slice(1);

    expect(() => cryptoService.decryptSignedString(parts.join(':'))).toThrow(
      'Invalid signature',
    );
  });
});
