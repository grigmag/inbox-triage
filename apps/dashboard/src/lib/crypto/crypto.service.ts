import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { env } from '@/server/env';

/** NOTE IMPORTANT:
 * Be very careful when changing methods in this class,
 * because this could impact the app's functionality.
 *
 * For example, the decryption of already encrypted chat messages
 * stored in the db could break.
 */
class CryptoService {
  private readonly encryptionAlgorithm = 'aes-256-cbc';
  private readonly hashingAlgorithm = 'sha256';

  private readonly encryptionSecret = Buffer.from(
    env.APP_ENCRYPTION_KEY,
    'hex',
  );
  private readonly hashingSecret = Buffer.from(env.APP_HASHING_KEY, 'hex');

  /**
   * Encrypts the provided string and generates a signature for the encrypted string.
   *
   * Returns a string of the form `iv:encryptedData:signature`,
   * where iv is a random initialization vector used for the encryption
   * and also needed for the decryption.
   */
  encryptAndSignString(data: string): string {
    const iv = randomBytes(16);

    const cipher = createCipheriv(
      this.encryptionAlgorithm,
      this.encryptionSecret,
      iv,
    );
    let encrypted = cipher.update(data, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    const signature = this.generateHmacSignature(encrypted);

    const ivString = iv.toString('hex');

    return `${ivString}:${encrypted}:${signature}`;
  }

  /**
   * Decrypts a string encrypted with the above method.
   *
   * Receives as input a string of the form `iv:encryptedData:signature`,
   * where iv is a random initialization vector used for the encryption
   * and also needed for the decryption.
   *
   * @throws Error if the signature is invalid.
   */
  decryptSignedString(encryptedData: string): string {
    const [ivString, encrypted, signature] = encryptedData.split(':');
    const iv = Buffer.from(ivString, 'hex');

    const hmac = this.generateHmacSignature(encrypted);
    if (hmac !== signature) {
      throw new Error('Invalid signature');
    }

    const decipher = createDecipheriv(
      this.encryptionAlgorithm,
      this.encryptionSecret,
      iv,
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
  }

  generateHmacSignature(data: string): string {
    const hmac = createHmac(this.hashingAlgorithm, this.hashingSecret);
    hmac.update(data);
    return hmac.digest('hex');
  }
}

export const cryptoService = new CryptoService();
