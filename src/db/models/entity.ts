import { eq } from 'drizzle-orm'
import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import { db } from '..'
import { omitUndefined } from '../../utils/general'
import { timestamps } from './common'
import type { Entity } from 'telegram/define'

export const entityTable = pgTable('entity', {
  id: text().primaryKey(),
  username: text(),
  displayName: text().notNull(),
  raw: jsonb().notNull().$type<Entity>(),
  ...timestamps,
})

export type DbEntity = typeof entityTable.$inferSelect
export type DbEntityInsert = typeof entityTable.$inferInsert

export async function queryDbEntity(id: string): Promise<DbEntity | undefined> {
  const [user] = await db
    .select()
    .from(entityTable)
    .where(eq(entityTable.id, id))
  return user
}

export async function upsertDbEntity(user: DbEntityInsert): Promise<void> {
  await db
    .insert(entityTable)
    .values(user)
    .onConflictDoUpdate({
      target: entityTable.id,
      set: omitUndefined({
        username: user.username,
        displayName: user.displayName,
        updatedAt: new Date(),
      }),
    })
}
