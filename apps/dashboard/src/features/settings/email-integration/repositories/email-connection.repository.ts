import 'server-only';

import type { Db } from '@inbox-triage/db/client';
import { emailConnections, type EmailConnection } from '@inbox-triage/db/schema';
import type { EmailProviderConfig } from '@inbox-triage/email';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';

export type StoredEmailConnection = EmailProviderConfig & {
  username: string;
  encryptedPassword: string;
};

type SaveEmailConnectionInput = StoredEmailConnection & { userId: string };

type ProviderColumns = Pick<
  EmailConnection,
  'provider' | 'imapHost' | 'smtpHost'
>;

// Gmail hosts are fixed in the email package, so Gmail rows store none. The
// database requires both hosts on Zoho rows.
function toProviderColumns(config: EmailProviderConfig): ProviderColumns {
  switch (config.provider) {
    case 'zoho':
      return {
        provider: 'zoho',
        imapHost: config.imapHost,
        smtpHost: config.smtpHost,
      };
    case 'gmail':
      return { provider: 'gmail', imapHost: null, smtpHost: null };
    default:
      return config satisfies never;
  }
}

function toProviderConfig(row: ProviderColumns): EmailProviderConfig {
  switch (row.provider) {
    case 'zoho':
      if (row.imapHost === null || row.smtpHost === null) {
        throw new Error('Zoho email connection is missing its hosts.');
      }
      return {
        provider: 'zoho',
        imapHost: row.imapHost,
        smtpHost: row.smtpHost,
      };
    case 'gmail':
      return { provider: 'gmail' };
    default:
      return row.provider satisfies never;
  }
}

// Callers must supply the authenticated local user's ID and encrypt passwords
// before saving. Rows contain credentials and must stay in server-only code.
class EmailConnectionRepository {
  constructor(private readonly database: Db) {}

  async findForUser(userId: string): Promise<StoredEmailConnection | null> {
    const [connection] = await this.database
      .select()
      .from(emailConnections)
      .where(eq(emailConnections.userId, userId))
      .limit(1);

    if (!connection) return null;

    return {
      ...toProviderConfig(connection),
      username: connection.username,
      encryptedPassword: connection.encryptedPassword,
    };
  }

  async saveForUser(input: SaveEmailConnectionInput): Promise<void> {
    const { userId, username, encryptedPassword } = input;
    const columns = {
      ...toProviderColumns(input),
      username,
      encryptedPassword,
    };
    await this.database
      .insert(emailConnections)
      .values({ userId, ...columns })
      .onConflictDoUpdate({
        target: emailConnections.userId,
        set: columns,
      });
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.database
      .delete(emailConnections)
      .where(eq(emailConnections.userId, userId));
  }
}

export const emailConnectionRepository = new EmailConnectionRepository(db);
