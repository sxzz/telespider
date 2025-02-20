import { blob, index, int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { Api } from 'telegram'

export const messagesTable = sqliteTable(
  'messages',
  {
    id: text().primaryKey(),
    peerId: text().notNull(),
    messageId: int().notNull(),
    text: text().notNull(),
    data: text({ mode: 'json' }).notNull().$type<Api.Message>(),
    media: blob(),
  },
  (table) => [index('peer_idx').on(table.peerId)],
)
