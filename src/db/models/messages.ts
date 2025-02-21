import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import { db, indexer } from '..'
import { timestamps } from './common'
import type { Api } from 'telegram'

export const messagesTable = pgTable(
  'messages',
  {
    id: text().primaryKey(),
    entityId: text().notNull(),
    messageId: text().notNull(),
    chatName: text().notNull(),
    fromUserId: text(),
    fromUserDisplayName: text(),
    text: text().notNull(),
    raw: jsonb().notNull().$type<Api.Message>(),
    ...timestamps,
  },
  (table) => [index('entity_id_idx').on(table.entityId)],
)

export async function insertMessages(
  messages: (typeof messagesTable.$inferInsert)[],
) {
  await Promise.all([
    indexer.addDocuments(messages, { primaryKey: 'id' }),
    ...messages.map((msg) =>
      db
        .insert(messagesTable)
        .values(msg)
        .onConflictDoUpdate({
          target: messagesTable.id,
          set: {
            ...msg,
            updatedAt: new Date(),
          },
        }),
    ),
  ])
}
