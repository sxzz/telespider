import type { Core } from '.'
import type { Buffer } from 'node:buffer'
import type { Api } from 'telegram'
import type { Entity } from 'telegram/define'

export function getUserDisplayName(user: Api.User) {
  return `${user.firstName || ''} ${user.lastName || ''}`.trim()
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
