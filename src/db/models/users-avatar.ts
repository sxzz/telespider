import { desc, eq } from 'drizzle-orm'
import { pgTable, text } from 'drizzle-orm/pg-core'
import { db } from '..'
import { timestamps } from './common'

export const usersAvatarTable = pgTable('users-avatar', {
  id: text().primaryKey(),
  userId: text().notNull(),
  data: text().notNull(),

  ...timestamps,
})

export async function getLatestAvatar(
  userId: string,
): Promise<string | undefined> {
  const [avatar] = await db
    .select()
    .from(usersAvatarTable)
    .where(eq(usersAvatarTable.userId, userId))
    .orderBy(desc(usersAvatarTable.createdAt))
  return avatar.data
}

export async function ensureAvatar(
  id: string,
  userId: string,
  data: string,
): Promise<void> {
  await db
    .insert(usersAvatarTable)
    .values({ id, userId, data })
    .onConflictDoNothing()
}
