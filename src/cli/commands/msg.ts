import process from 'node:process'
import consola from 'consola'
import { Api } from 'telegram'
import { getDisplayName } from 'telegram/Utils'
import { getEntityType, type EntityType } from '../../core/utils'
import * as models from '../../db/models'
import {
  convertApiMessage,
  getDbPeerId,
  getNextMessageId,
  mergeMessageRanges,
} from '../../services/message'
import { initCli } from '../init'
import type { Core } from '../../core'
import type { Entity } from 'telegram/define'

interface ChannelLinkedChat {
  channel: Api.Channel
  isLinkedChat: true
}

export async function msg({ type = 'all' }: { type?: EntityType }) {
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
  let count = 0

  const completedIds = await models.getCompletedPeerIds(me.id.valueOf())
  const selecteds = await consola.prompt('Select entities:', {
    type: 'multiselect',
    cancel: 'null',
    initial: completedIds
      .map((id) => {
        const idx = entitiesWithLink.findIndex((entity) => {
          if ('isLinkedChat' in entity) return false
          return entity.id.valueOf() === id
        })
        return String(idx)
      })
      .filter((idx) => idx !== '-1'),
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

    const { peerId, peerOwnerId } = getDbPeerId(me, entity)
    const messageRange = await models.getMessageRange(peerId, peerOwnerId)
    let jumpToId: number | undefined

    // TODO
    const reverse = false
    const nextOne = reverse ? 1 : -1
    const lastOne = -nextOne
    let initialId = messageRange.initialId

    do {
      let start: number | null = null
      let end: number | null = null
      let offsetId: number | undefined
      if (jumpToId) {
        // offset id is the last message id of the previous batch
        offsetId = jumpToId + lastOne
        jumpToId = undefined
        start = null
        end = null
      }

      for await (const msg of core.client.iterMessages(entity, {
        reverse,
        offsetId,
      })) {
        const currentId = (end = msg.id)
        if (start === null) {
          start = offsetId == null ? currentId : offsetId + nextOne
        }
        messages.push(convertApiMessage(me, entity, msg))
        count++

        const next = getNextMessageId(
          messageRange.ranges,
          currentId,
          reverse,
          initialId ?? undefined,
        )
        if (next == null) {
          consola.info('Skip saved messages')
          break
        }
        if (next !== currentId + nextOne) {
          consola.info('Jump to message id:', next)
          jumpToId = next
          break
        }

        if (messages.length >= 500) {
          await commit(start, end)
          consola.success(`Saved ${count} messages in total.`)
        }
      }

      if (!reverse && initialId == null && jumpToId == null) {
        initialId = end ?? offsetId ?? null
      }
      await commit(start, end)
    } while (jumpToId != null)

    // eslint-disable-next-line unicorn/consistent-function-scoping
    async function commit(start: number | null, end: number | null) {
      if (messages.length) {
        await models.insertMessages(messages)
        messages = []
      }
      if (start != null && end != null) {
        messageRange.ranges = mergeMessageRanges([
          ...messageRange.ranges,
          [Math.min(start, end), Math.max(start, end)],
        ])
      }
      await models.updateMessageRange(peerId, peerOwnerId, {
        initialId,
        ranges: messageRange.ranges,
      })
    }
  }

  consola.success('Done!')
  process.exit(0)
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
