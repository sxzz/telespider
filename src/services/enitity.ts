import { Api } from 'telegram'
import { getDisplayName } from 'telegram/Utils'
import {
  downloadEntityAvatar,
  getEntityAvatarId,
  getEntityUsername,
} from '../core/utils'
import {
  upsertDbEntities,
  type DbEntity,
  type EntityKind,
} from '../db/models/entity'
import { hasAvatarId, insertEntityAvatar } from '../db/models/entity-avatar'
import type { Core } from '../core'
import type { Entity } from 'telegram/define'

async function registerAvatar(core: Core, entity: Entity) {
  const avatarId = getEntityAvatarId(entity)?.toString()
  if (!avatarId || (await hasAvatarId(avatarId))) return

  const photo = await downloadEntityAvatar(core, entity)
  if (photo)
    insertEntityAvatar(avatarId, entity.id.toString(), photo.toString('base64'))
}

function registerAvatars(core: Core, entities: Entity[]) {
  return Promise.all(entities.map((entity) => registerAvatar(core, entity)))
}

export function registerEntities(core: Core, entities: Entity[]) {
  return Promise.all([
    upsertDbEntities(
      entities.map((entity) => ({
        id: entity.id.toString(),
        username: getEntityUsername(entity),
        displayName: getDisplayName(entity),
        kind: getEntityKind(entity),
        isBot: 'bot' in entity && !!entity.bot,
        raw: entity,
      })),
    ),
    registerAvatars(core, entities),
  ])
}

export function getEntityKind(entity: Entity): EntityKind {
  return (
    {
      User: 'user',
      UserEmpty: 'user',

      Channel: 'channel',
      ChannelForbidden: 'channel',

      Chat: 'chat',
      ChatEmpty: 'chat',
      ChatForbidden: 'chat',
    } as const
  )[entity.className]
}

export function getDbEntityRaw(dbEntity: DbEntity): Entity
export function getDbEntityRaw(dbEntity?: DbEntity): Entity | undefined
export function getDbEntityRaw(dbEntity?: DbEntity): Entity | undefined {
  if (!dbEntity) return
  return new Api[dbEntity.raw.className](dbEntity.raw as any)
}
