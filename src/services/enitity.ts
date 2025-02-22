import { eq } from 'drizzle-orm'
import { Api } from 'telegram'
import { getDisplayName } from 'telegram/Utils'
import {
  downloadEntityAvatar,
  getEntityAvatarId,
  getEntityUsername,
} from '../core/utils'
import { db } from '../db'
import {
  upsertDbEntities,
  type DbEntity,
  type EntityKind,
} from '../db/models/entity'
import { hasAvatarId, insertEntityAvatar } from '../db/models/entity-avatar'
import { entityParticipantTable } from '../db/models/entity-participant'
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

export async function addAllEntityParticipants(
  entity: Entity,
  participants: Api.User[],
): Promise<void> {
  const entityId = entity.id.toString()
  const entityName = getDisplayName(entity)

  await db.transaction(async (tx) => {
    await tx
      .update(entityParticipantTable)
      .set({ isLeft: true })
      .where(eq(entityParticipantTable.entityId, entityId))

    for (const participant of participants) {
      const obj = {
        id: `${entityId}_${participant.id}`,
        entityId,
        entityName,
        userId: participant.id.toString(),
        userDisplayName: getDisplayName(participant),
        isLeft: false,
      }
      await tx
        .insert(entityParticipantTable)
        .values(obj)
        .onConflictDoUpdate({
          target: entityParticipantTable.id,
          set: { ...obj, updatedAt: new Date() },
        })
    }
  })
}
