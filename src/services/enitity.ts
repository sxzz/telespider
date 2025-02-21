import { Api } from 'telegram'
import { getDisplayName } from 'telegram/Utils'
import { getEntityUsername } from '../core/utils'
import { upsertDbEntity, type DbEntity } from '../db/models/entity'
import type { Entity } from 'telegram/define'

export function registerEntity(users: Api.TypeUser[]) {
  return Promise.all(
    users.map((user) =>
      upsertDbEntity({
        id: user.id.toString(),
        username: getEntityUsername(user),
        displayName: getDisplayName(user),
        raw: user,
      }),
    ),
  )
}

export function getDbEntityRaw(dbEntity: DbEntity): Entity
export function getDbEntityRaw(dbEntity?: DbEntity): Entity | undefined
export function getDbEntityRaw(dbEntity?: DbEntity): Entity | undefined {
  if (!dbEntity) return
  return new Api[dbEntity.raw.className](dbEntity.raw as any)
}
