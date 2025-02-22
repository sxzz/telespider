import { boolean, index, pgTable, text } from 'drizzle-orm/pg-core'
import { timestamps } from './common'

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
    index('created_at_idx').on(table.createdAt),
  ],
)
