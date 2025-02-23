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
  const isPrivateChat = msg.peerId.className === 'PeerUser'
  let peerOwnerId: string | undefined

  if (isPrivateChat) {
    peerOwnerId = me.id.toString()
  }

  let id = `${peer.id}_`
  if (peerOwnerId) id += `${peerOwnerId}_`
  id += msg.id

  const sender = msg.sender || (isPrivateChat ? peer : undefined)

  return {
    id,
    peerId: peer.id.toString(),
    peerName: getDisplayName(peer),
    peerKind: getEntityKind(peer),
    peerOwnerId,
    fromUserId: sender && sender.id.toString(),
    fromUserDisplayName: sender && getDisplayName(sender),
    messageId: msg.id.toString(),
    text: msg.text,
    sentAt: msg.date ? new Date(msg.date * 1000) : undefined,
    fwdFromName: msg.fwdFrom?.fromName || msg.fwdFrom?.postAuthor,
    fwdFromDate: msg.fwdFrom?.date
      ? new Date(msg.fwdFrom.date * 1000)
      : undefined,
    raw: msg,
  }
}
