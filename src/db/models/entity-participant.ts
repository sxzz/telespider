import { eq } from 'drizzle-orm'
import { boolean, index, pgTable, text } from 'drizzle-orm/pg-core'
import { getDisplayName } from 'telegram/Utils'
import { db } from '..'
import { timestamps } from './common'
import type { Api } from 'telegram'
import type { Entity } from 'telegram/define'

export const entityParticipantTable = pgTable(
  'entity-participant',
  {
    id: text().primaryKey(),
    entityId: text().notNull(),
    entityName: text().notNull(),

    userId: text().notNull(),
    userDisplayName: text().notNull(),

    isLeft: boolean().notNull(),

    ...timestamps,
  },
  (table) => [
    index('entity_name').on(table.entityName),
    index('user_display_name_left_idx').on(table.userDisplayName, table.isLeft),
  ],
)

export async function addAllEntityParticipants(
  entity: Entity,
  participants: Api.User[],
): Promise<void> {
  const entityId = entity.id.toString()
  const entityName = getDisplayName(entity)

  await db.transaction(async (tx) => {
    await tx
      .update(entityParticipantTable)
      .set({ isLeft: true })
      .where(eq(entityParticipantTable.entityId, entityId))

    for (const participant of participants) {
      const obj = {
        id: `${entityId}_${participant.id}`,
        entityId,
        entityName,
        userId: participant.id.toString(),
        userDisplayName: getDisplayName(participant),
        isLeft: false,
      }
      await tx
        .insert(entityParticipantTable)
        .values(obj)
        .onConflictDoUpdate({
          target: entityParticipantTable.id,
          set: { ...obj, updatedAt: new Date() },
        })
    }
  })
}
