import consola from 'consola'
import { Api } from 'telegram'
import { getDisplayName } from 'telegram/Utils'
import { addAllEntityParticipants } from '../db/models/entity-participant'
import { registerEntities } from '../services/enitity'
import type { Core } from '../core'
import { initCli } from './init'
import type { Entity } from 'telegram/define'

main()

async function main() {
  await using context = await initCli()
  const { core } = context

  const dialogs = await Array.fromAsync(core.client.iterDialogs())

  for (const dialog of dialogs) {
    if (!dialog.entity) continue
    await registerEntity(core, dialog.entity)
  }
}

export async function registerEntity(
  core: Core,
  entity: Entity,
  isLinked?: boolean,
) {
  const entityName = getDisplayName(entity)
  consola.info(`Registering ${entity.className} ${entityName}`)
  await registerEntities(core, [entity])

  const iter = core.client.iterParticipants(entity)
  const participants = await Array.fromAsync(iter).catch(() => {
    consola.warn('Failed to get participants of', entityName)
    return []
  })

  await addAllEntityParticipants(entity, participants)
  for (const user of participants) {
    await registerEntities(core, [user])
  }

  if (!isLinked && entity.className === 'Channel') {
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
      if (entity) await registerEntity(core, entity, true)
    }
  }
}
