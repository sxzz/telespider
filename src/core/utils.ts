import type { Core } from '.'
import type { Buffer } from 'node:buffer'
import type { Api } from 'teleproto'
import type { Entity } from 'teleproto/define'

export function getUserDisplayName(user: Api.User) {
  return `${user.firstName || ''} ${user.lastName || ''}`.trim()
}

export const ENTITY_TYPES = ['all', 'chat', 'channel', 'user', 'bot'] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export function getEntityType(entity: Entity): EntityType {
  switch (entity.className) {
    case 'Channel':
    case 'ChannelForbidden':
      return 'channel'
    case 'Chat':
    case 'ChatEmpty':
    case 'ChatForbidden':
      return 'chat'
    case 'User':
      return entity.bot ? 'bot' : 'user'
    case 'UserEmpty':
      return 'user'
  }
}

export function getEntityUsername(entity: Entity): string | undefined {
  if ('username' in entity) return entity.username
  return undefined
}

export function getEntityAvatarId(entity: Entity) {
  if (!('photo' in entity) || !entity.photo || !('photoId' in entity.photo))
    return
  return entity.photo.photoId
}

export async function downloadEntityAvatar(
  core: Core,
  entity: Entity,
): Promise<Buffer | undefined> {
  if (!('photo' in entity) || !entity.photo || !('photoId' in entity.photo))
    return
  const photo = await core.client.downloadProfilePhoto(entity)
  return photo as Buffer | undefined
}
