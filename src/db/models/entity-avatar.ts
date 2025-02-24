import { desc, eq } from 'drizzle-orm'
import { pgTable, text } from 'drizzle-orm/pg-core'
import { db } from '..'
import { timestamps } from './common'

export const entityAvatarTable = pgTable('entity_avatar', {
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
    .from(entityAvatarTable)
    .where(eq(entityAvatarTable.userId, userId))
    .orderBy(desc(entityAvatarTable.createdAt))
  return avatar.data
}

export async function hasAvatarId(id: string) {
  return (await db.$count(entityAvatarTable, eq(entityAvatarTable.id, id))) > 0
}

export async function insertEntityAvatar(
  id: string,
  userId: string,
  data: string,
): Promise<void> {
  await db
    .insert(entityAvatarTable)
    .values({ id, userId, data })
    .onConflictDoNothing()
}
