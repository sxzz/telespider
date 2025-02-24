import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { db, indexer } from '..'
import { timestamps } from './common'
import { entityKind } from './entity'
import type { Api } from 'telegram'

export const messageTable = pgTable(
  'message',
  {
    id: text().primaryKey(),
    peerId: bigint({ mode: 'number' }).notNull(),
    peerName: text().notNull(),
    peerKind: entityKind().notNull(),
    /** only for private chat */
    peerOwnerId: bigint({ mode: 'number' }),
    messageId: bigint({ mode: 'number' }).notNull(),
    fromUserId: bigint({ mode: 'number' }),
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
    index('message_created_at_idx').on(table.createdAt),
    index('message_created_at_peer_name_idx').on(
      table.createdAt,
      table.peerName,
    ),
    index('message_peer_owner_created_at_id').on(
      table.peerOwnerId,
      table.createdAt,
    ),
  ],
)

export type DbMessage = typeof messageTable.$inferSelect
export type DbMessageInsert = typeof messageTable.$inferInsert

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
