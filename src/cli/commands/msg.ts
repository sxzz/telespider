import process from 'node:process'
import consola from 'consola'
import { Api } from 'telegram'
import { getDisplayName } from 'telegram/Utils'
import { getEntityType, type EntityType } from '../../core/utils'
import * as models from '../../db/models'
import { convertApiMessage } from '../../services/message'
import { initCli } from '../init'
import type { Core } from '../../core'
import type { Entity } from 'telegram/define'

interface ChannelLinkedChat {
  channel: Api.Channel
  isLinkedChat: true
}

export async function msg({
  type = 'all',
  limit,
}: {
  type?: EntityType
  limit?: number
}) {
  limit = limit ? +limit : undefined

  await using context = await initCli()
  const { core } = context

  const me = await core.client.getMe()

  const dialogs = await Array.fromAsync(core.client.iterDialogs())
  let entities = dialogs
    .map((dialog) => dialog.entity)
    .filter((entity) => !!entity)
  if (type !== 'all') {
    entities = entities.filter((entity) => getEntityType(entity) === type)
  }

  const entitiesWithLink = entities.flatMap<Entity | ChannelLinkedChat>(
    (entity) => {
      if (entity.className === 'Channel' && entity.hasLink) {
        return [entity, { channel: entity, isLinkedChat: true }]
      }
      return entity
    },
  )

  let messages: models.DbMessageInsert[] = []

  const selecteds = await consola.prompt('Select entities:', {
    type: 'multiselect',
    cancel: 'null',
    options: entitiesWithLink.map((entity, i) => {
      const kind = 'isLinkedChat' in entity ? 'channel' : getEntityType(entity)
      const title =
        'isLinkedChat' in entity
          ? `${getDisplayName(entity.channel)}'s linked chat`
          : getDisplayName(entity)
      return {
        label: `[${kind}] ${title}`,
        value: String(i),
      }
    }),
  })
  if (selecteds == null) process.exit(0)

  const seen = new Set<number>()
  for (const idx of selecteds) {
    let entity = entitiesWithLink[Number(idx)]
    if ('isLinkedChat' in entity) {
      const linkedChat = await getLinkedChat(core, entity.channel)
      if (!linkedChat) {
        consola.warn('No linked chat found for', getDisplayName(entity.channel))
        continue
      }
      entity = linkedChat
    }

    if (seen.has(entity.id.valueOf())) {
      consola.info('Already fetched messages from', getDisplayName(entity))
      continue
    }
    seen.add(entity.id.valueOf())

    consola.info(`Fetching messages from ${getDisplayName(entity)}`)

    // const reverse = await consola.prompt('Reverse?', {
    //   type: 'confirm',
    //   initial: false,
    // })

    let i = 0
    try {
      for await (const msg of core.client.iterMessages(entity, {
        // offsetDate: earliestMessage?.raw.date,
        // reverse,
        limit,
      })) {
        messages.push(convertApiMessage(me, entity, msg))

        i++
        if (messages.length >= 500) {
          consola.success(`Saved ${i} messages in total.`)
          await commit()
        }
      }
    } catch (error: any) {
      consola.error(error)
    }
    await commit()
  }

  async function commit() {
    if (!messages.length) return
    await models.insertMessages(messages)
    messages = []
  }
}

export async function getLinkedChat(
  core: Core,
  entity: Entity,
): Promise<Entity | undefined> {
  const result = await core.client.invoke(
    new Api.channels.GetFullChannel({ channel: entity }),
  )
  if (
    result.fullChat.className === 'ChannelFull' &&
    result.fullChat.linkedChatId
  ) {
    return core.client.getEntity(result.fullChat.linkedChatId)
  }
}
