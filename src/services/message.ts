import { getEntityDisplayName, getEntityId } from '../core/utils'
import type { messagesTable } from '../db/models'
import type { Api } from 'telegram'

export function convertApiMessage(
  entityId: string,
  chatName: string,
  msg: Api.Message,
): typeof messagesTable.$inferInsert {
  const id = `${entityId}_${msg.id}`
  return {
    id,
    entityId,
    chatName,
    fromUserId: msg.sender && getEntityId(msg.sender).toString(),
    fromUserDisplayName: msg.sender && getEntityDisplayName(msg.sender),
    messageId: msg.id.toString(),
    text: msg.text,
    raw: msg,
  }
}
