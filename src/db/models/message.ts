import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { db, indexer } from '..'
import { timestamps } from './common'
import type { Api } from 'telegram'

export const messageTable = pgTable(
  'message',
  {
    id: text().primaryKey(),
    peerId: text().notNull(),
    peerName: text().notNull(),
    messageId: text().notNull(),
    fromUserId: text(),
    fromUserDisplayName: text(),
    text: text().notNull(),
    sentAt: timestamp(),
    fwdFromName: text(),
    fwdFromDate: timestamp(),
    raw: jsonb().notNull().$type<Api.Message>(),
    ...timestamps,
  },
  (table) => [
    index('peer_id_idx').on(table.peerId),
    index('from_user_id_idx').on(table.fromUserId),
    index('from_user_display_name_idx').on(table.fromUserDisplayName),
    index('sent_at_idx').on(table.sentAt),
  ],
)

export async function insertMessages(
  messages: (typeof messageTable.$inferInsert)[],
) {
  await Promise.all([
    indexer.addDocuments(messages, { primaryKey: 'id' }),
    ...messages.map((msg) =>
      db
        .insert(messageTable)
        .values(msg)
        .onConflictDoUpdate({
          target: messageTable.id,
          set: {
            ...msg,
            updatedAt: new Date(),
          },
        }),
    ),
  ])
}
