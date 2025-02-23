import { eq } from 'drizzle-orm'
import { Api } from 'telegram'
import { getDisplayName } from 'telegram/Utils'
import {
  downloadEntityAvatar,
  getEntityAvatarId,
  getEntityUsername,
} from '../core/utils'
import { db } from '../db'
import * as models from '../db/models'
import type { Core } from '../core'
import type { Entity } from 'telegram/define'

async function registerAvatar(core: Core, entity: Entity) {
  const avatarId = getEntityAvatarId(entity)?.toString()
  if (!avatarId || (await models.hasAvatarId(avatarId))) return

  const photo = await downloadEntityAvatar(core, entity)
  if (photo)
    models.insertEntityAvatar(
      avatarId,
      entity.id.toString(),
      photo.toString('base64'),
    )
}

function registerAvatars(core: Core, entities: Entity[]) {
  return Promise.all(entities.map((entity) => registerAvatar(core, entity)))
}

export function registerEntities(core: Core, entities: Entity[]) {
  return Promise.all([
    models.upsertDbEntities(
      entities.map((entity) => ({
        id: entity.id.valueOf(),
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

export function getEntityKind(entity: Entity): models.EntityKind {
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

export function getDbEntityRaw(dbEntity: models.DbEntity): Entity
export function getDbEntityRaw(dbEntity?: models.DbEntity): Entity | undefined
export function getDbEntityRaw(dbEntity?: models.DbEntity): Entity | undefined {
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
      .update(models.entityParticipantTable)
      .set({ isLeft: true })
      .where(eq(models.entityParticipantTable.entityId, entityId))

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
        .insert(models.entityParticipantTable)
        .values(obj)
        .onConflictDoUpdate({
          target: models.entityParticipantTable.id,
          set: { ...obj, updatedAt: new Date() },
        })
    }
  })
}
