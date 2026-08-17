import { auth } from '@clerk/nextjs/server';
import type { Db } from '@inbox-triage/db/client';
import { users, type User } from '@inbox-triage/db/schema';

/**
 * Requires an authenticated Clerk session and returns its local application user.
 * Creates the local user on first access; concurrent calls are safe and resolve
 * to the same row.
 */
export async function requireUser(db: Db): Promise<User> {
  const { userId: clerkUserId } = await auth.protect();
  const existing = await findUserByClerkUserId(db, clerkUserId);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(users)
    .values({ clerkUserId })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning();

  if (created) {
    return created;
  }

  const recovered = await findUserByClerkUserId(db, clerkUserId);

  if (!recovered) {
    throw new Error(
      `Local user for Clerk subject ${clerkUserId} could not be created or recovered.`,
    );
  }

  return recovered;
}

function findUserByClerkUserId(db: Db, clerkUserId: string) {
  return db.query.users.findFirst({
    where: (user, { eq }) => eq(user.clerkUserId, clerkUserId),
  });
}
