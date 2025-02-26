import { and, eq, isNotNull, isNull, or } from 'drizzle-orm'
import { bigint, jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import { db } from '..'
import { timestamps } from './common'

export type MessageRange = [start: number, end: number]

export const messageRangeTable = pgTable('message_range', {
  id: text().primaryKey(),
  peerOwnerId: bigint({ mode: 'number' }),
  peerId: bigint({ mode: 'number' }).notNull(),
  initialId: bigint({ mode: 'number' }),
  ranges: jsonb().$type<MessageRange[]>().notNull(),
  ...timestamps,
})

export async function getMessageRange(
  peerId: number,
  peerOwnerId: number | undefined,
): Promise<
  Omit<typeof messageRangeTable.$inferSelect, 'createdAt' | 'updatedAt'>
> {
  const record = (
    await db
      .select()
      .from(messageRangeTable)
      .where(
        and(
          eq(messageRangeTable.peerId, peerId),
          peerOwnerId != null
            ? eq(messageRangeTable.peerOwnerId, peerOwnerId)
            : undefined,
        ),
      )
  )[0]

  return (
    record || {
      peerOwnerId,
      peerId,
      initialId: null,
      ranges: [],
    }
  )
}

export function updateMessageRange(
  peerId: number,
  peerOwnerId: number | undefined,
  range: Pick<typeof messageRangeTable.$inferInsert, 'initialId' | 'ranges'>,
) {
  let id = String(peerId)
  if (peerOwnerId) id += `_${peerOwnerId}`
  const set = {
    initialId: range.initialId,
    ranges: range.ranges,
  }
  return db
    .insert(messageRangeTable)
    .values({ id, peerId, peerOwnerId, ...set })
    .onConflictDoUpdate({
      target: [messageRangeTable.id],
      set: { ...set, updatedAt: new Date() },
    })
}

export async function getCompletedPeerIds(ownerId: number) {
  const data = await db
    .select({
      peerId: messageRangeTable.peerId,
    })
    .from(messageRangeTable)
    .where(
      and(
        isNotNull(messageRangeTable.initialId),
        or(
          isNull(messageRangeTable.peerOwnerId),
          eq(messageRangeTable.peerOwnerId, ownerId),
        ),
      ),
    )
  return data.map((x) => x.peerId)
}
