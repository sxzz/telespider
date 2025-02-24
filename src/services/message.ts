import { getDisplayName } from 'telegram/Utils'
import type * as models from '../db/models'
import { getEntityKind } from './entity'
import type { Api } from 'telegram'
import type { Entity } from 'telegram/define'

export function convertApiMessage(
  me: Api.User,
  peer: Entity,
  msg: Api.Message,
): typeof models.messageTable.$inferInsert {
  const { peerId, peerOwnerId, isUser } = getDbPeerId(me, peer)

  let id = `${peerId}_`
  if (peerOwnerId) id += `${peerOwnerId}_`
  id += msg.id

  const sender = msg.sender || (isUser ? peer : undefined)

  return {
    id,
    peerId: peer.id.valueOf(),
    peerName: getDisplayName(peer),
    peerKind: getEntityKind(peer),
    peerOwnerId,
    fromUserId: sender && sender.id.valueOf(),
    fromUserDisplayName: sender && getDisplayName(sender),
    messageId: msg.id,
    text: msg.text,
    sentAt: msg.date ? new Date(msg.date * 1000) : undefined,
    fwdFromName: msg.fwdFrom?.fromName || msg.fwdFrom?.postAuthor,
    fwdFromDate: msg.fwdFrom?.date
      ? new Date(msg.fwdFrom.date * 1000)
      : undefined,
    raw: msg,
  }
}

export function mergeMessageRanges(
  ranges: models.MessageRange[],
): models.MessageRange[] {
  if (ranges.length === 0) return []

  ranges.sort((a, b) => a[0] - b[0])
  const merged: models.MessageRange[] = [ranges[0]]

  for (let i = 1; i < ranges.length; i++) {
    const current = ranges[i]
    const last = merged.at(-1)!

    if (current[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], current[1])
    } else {
      merged.push(current)
    }
  }

  return merged
}

export function getNextMessageId(
  ranges: models.MessageRange[],
  current: number,
  reverse?: boolean,
  minValue: number = 1,
): number | null {
  if (reverse) {
    let candidate = current + 1
    for (const [start, end] of ranges) {
      if (candidate < start) return candidate
      if (candidate <= end) candidate = end + 1
    }
    return candidate
  } else {
    let candidate = current - 1
    if (candidate < minValue) return null

    for (let i = ranges.length - 1; i >= 0; i--) {
      const [start, end] = ranges[i]
      if (candidate > end) return candidate
      if (candidate >= start) {
        candidate = start - 1
        if (candidate < minValue) return null
      }
    }
    return candidate >= minValue ? candidate : null
  }
}

export function getDbPeerId(me: Api.User, peer: Entity) {
  const isUser = peer.className === 'User' || peer.className === 'UserEmpty'
  const peerOwnerId = isUser ? me.id.valueOf() : undefined
  return {
    peerId: peer.id.valueOf(),
    isUser,
    peerOwnerId,
  }
}
