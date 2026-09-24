import 'server-only';

import type { Db } from '@inbox-triage/db/client';
import { emailConnections, type EmailConnection } from '@inbox-triage/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';

type SaveEmailConnectionInput = {
  userId: string;
  provider: 'zoho';
  username: string;
  imapHost: string;
  smtpHost: string;
  encryptedPassword: string;
};

// Callers must supply the authenticated local user's ID and encrypt passwords
// before saving. Rows contain credentials and must stay in server-only code.
class EmailConnectionRepository {
  constructor(private readonly database: Db) {}

  async findForUser(userId: string): Promise<EmailConnection | null> {
    const [connection] = await this.database
      .select()
      .from(emailConnections)
      .where(eq(emailConnections.userId, userId))
      .limit(1);

    return connection ?? null;
  }

  async saveForUser(input: SaveEmailConnectionInput): Promise<EmailConnection> {
    const {
      userId,
      provider,
      username,
      imapHost,
      smtpHost,
      encryptedPassword,
    } = input;
    const [saved] = await this.database
      .insert(emailConnections)
      .values({
        userId,
        provider,
        username,
        imapHost,
        smtpHost,
        encryptedPassword,
      })
      .onConflictDoUpdate({
        target: emailConnections.userId,
        set: {
          provider,
          username,
          imapHost,
          smtpHost,
          encryptedPassword,
        },
      })
      .returning();

    if (!saved) throw new Error('Email connection upsert returned no row.');

    return saved;
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.database
      .delete(emailConnections)
      .where(eq(emailConnections.userId, userId));
  }
}

export const emailConnectionRepository = new EmailConnectionRepository(db);
