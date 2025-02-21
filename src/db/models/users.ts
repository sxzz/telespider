import { eq } from 'drizzle-orm'
import { pgTable, text } from 'drizzle-orm/pg-core'
import { db } from '..'
import { timestamps } from './common'

export const usersTable = pgTable('users', {
  id: text().primaryKey(),
  username: text(),
  displayName: text().notNull(),
  ...timestamps,
})

export type User = typeof usersTable.$inferSelect
export type UserInsert = typeof usersTable.$inferInsert

export async function queryUser(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id))
  return user
}

export async function upsertUser(user: UserInsert): Promise<void> {
  await db
    .insert(usersTable)
    .values(user)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { updatedAt: new Date() },
    })
}
