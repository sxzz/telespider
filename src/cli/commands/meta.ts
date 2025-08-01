import consola from 'consola'
import { Api } from 'teleproto'
import { getDisplayName } from 'teleproto/Utils'
import { getEntityType, type EntityType } from '../../core/utils'
import {
  addAllEntityParticipants,
  registerEntities,
} from '../../services/entity'
import { select } from '../../utils/select'
import { initCli } from '../init'
import type { Core } from '../../core'
import type { Entity } from 'teleproto/define'

export async function meta({ type = 'all' }: { type?: EntityType }) {
  await using context = await initCli()
  const { core } = context

  let entities = (await Array.fromAsync(core.client.iterDialogs()))
    .map((dialog) => dialog.entity)
    .filter((ent) => !!ent)
  if (type !== 'all') {
    entities = entities.filter((entity) => getEntityType(entity) === type)
  }

  const p = registerEntities(core, entities)

  const groups = entities.filter(
    (ent) => getEntityType(ent) !== 'user' && getEntityType(ent) !== 'bot',
  )
  const selecteds = await select(
    'Select groups and channels',
    groups.map((grp, i) => ({
      name: getDisplayName(grp),
      value: String(i),
    })),
  )
  if (!selecteds) return
  const selectedGroups = selecteds.map((i) => groups[Number(i)])
  await p
  for (const entity of selectedGroups) {
    await registerGroup(core, entity)
  }
}

const seen = new Set<string>()

async function registerGroup(core: Core, entity: Entity) {
  if (seen.has(entity.id.toString())) return
  seen.add(entity.id.toString())

  const entityName = getDisplayName(entity)
  consola.info(`Registering ${entity.className} ${entityName}`)

  const iter = core.client.iterParticipants(entity)
  const participants = await Array.fromAsync(iter).catch(() => {
    consola.warn('Failed to get participants of', entityName)
    return []
  })

  await addAllEntityParticipants(entity, participants)
  for (const user of participants) {
    await registerEntities(core, [user])
  }

  if (getEntityType(entity) === 'channel') {
    if ('linkedMonoforumId' in entity && entity.linkedMonoforumId) {
      const monoforum = await core.client
        .getEntity(entity.linkedMonoforumId)
        .catch(() => null)
      if (monoforum) {
        await registerEntities(core, [monoforum])
        await registerGroup(core, monoforum)
      }
    }

    const result = await core.client.invoke(
      new Api.channels.GetFullChannel({ channel: entity }),
    )
    if (
      result.fullChat.className === 'ChannelFull' &&
      result.fullChat.linkedChatId
    ) {
      const entity = await core.client
        .getEntity(result.fullChat.linkedChatId)
        .catch(() => null)
      if (entity) {
        await registerEntities(core, [entity])
        await registerGroup(core, entity)
      }
    }
  }
}
