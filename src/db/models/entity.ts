import { eq } from 'drizzle-orm'
import { boolean, jsonb, pgEnum, pgTable, text } from 'drizzle-orm/pg-core'
import { db } from '..'
import { omitUndefined } from '../../utils/general'
import { timestamps } from './common'
import type { Entity } from 'telegram/define'

export const entityKind = pgEnum('entity_kind', ['user', 'chat', 'channel'])
export type EntityKind = (typeof entityKind.enumValues)[number]

export const entityTable = pgTable('entity', {
  id: text().primaryKey(),
  username: text(),
  displayName: text().notNull(),
  kind: entityKind().notNull(),
  isBot: boolean().notNull(),
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

export async function upsertDbEntity(dbEntity: DbEntityInsert): Promise<void> {
  await db
    .insert(entityTable)
    .values(dbEntity)
    .onConflictDoUpdate({
      target: entityTable.id,
      set: omitUndefined({
        username: dbEntity.username,
        displayName: dbEntity.displayName,
        updatedAt: new Date(),
      }),
    })
}

export function upsertDbEntities(dbEntities: DbEntityInsert[]) {
  return Promise.all(dbEntities.map(upsertDbEntity))
}
