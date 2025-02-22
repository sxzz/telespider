import { getDisplayName, getPeerId } from 'telegram/Utils'
import type * as models from '../db/models'
import type { Api } from 'telegram'
import type { Entity } from 'telegram/define'

export function convertApiMessage(
  peer: Entity,
  msg: Api.Message,
): typeof models.messageTable.$inferInsert {
  const id = `${peer.id}_${msg.id}`
  const privateChat =
    msg.fromId && getPeerId(msg.peerId) === getPeerId(msg.fromId)
  const sender = msg.sender || (privateChat ? peer : undefined)

  return {
    id,
    peerId: peer.id.toString(),
    peerName: getDisplayName(peer),
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
