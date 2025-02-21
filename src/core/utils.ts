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

export async function fetchEntityAvatar(
  core: Core,
  entity: Entity,
): Promise<[id: string, photo: Buffer | undefined] | undefined> {
  if (!('photo' in entity) || !entity.photo || !('photoId' in entity.photo))
    return
  const photoId = entity.photo.photoId.toString()
  const photo = await core.client.downloadProfilePhoto(entity)
  return [photoId, photo as Buffer | undefined]
}
