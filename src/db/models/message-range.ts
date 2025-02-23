import { bigint, jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import { timestamps } from './common'
import type { Api } from 'telegram'

export interface MessageRange {
  start: number
  end: number
}

export const messageRangeTable = pgTable('message-range', {
  id: text().primaryKey(),
  peerOwnerId: bigint({ mode: 'number' }),
  peerId: bigint({ mode: 'number' }),
  startFrom: bigint({ mode: 'number' }),
  ranges: jsonb().$type<Api.MessageRange[]>(),
  ...timestamps,
})

export function getMessageRange() {}
