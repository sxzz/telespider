import assert from 'node:assert'
import process from 'node:process'
import consola from 'consola'
import { Api } from 'telegram'
import { getDisplayName } from 'telegram/Utils'
import * as models from '../../db/models'
import { convertApiMessage } from '../../services/message'
import { initCli } from '../init'
import type { Core } from '../../core'
import type { Entity } from 'telegram/define'

export async function msg() {
  await using context = await initCli()
  const { core } = context

  const dialogs = await Array.fromAsync(core.client.iterDialogs())
  let messages: models.DbMessageInsert[] = []

  while (true) {
    await single()
  }

  async function single() {
    const idx = await consola.prompt('Select a dialog:', {
      type: 'select',
      cancel: 'null',
      options: dialogs.map((dialog, i) => {
        const type = dialog.entity?.className
          ? `[${dialog.entity.className.toLowerCase()}] `
          : ''
        const title =
          dialog.title ||
          (dialog.entity ? getDisplayName(dialog.entity) : '(Unnamed)')
        return {
          label: type + title,
          value: String(i),
        }
      }),
    })
    if (idx == null) process.exit(0)

    if (idx == null) return
    const dialog = dialogs[Number(idx)]

    let entity = dialog.entity
    assert(entity)
    if (
      entity?.className === 'Channel' &&
      entity.hasLink &&
      (await consola.prompt('Get linked group?', {
        type: 'confirm',
        initial: false,
      }))
    ) {
      const linkedChat = await getLinkedChat(core, entity)
      if (!linkedChat) {
        console.error('No linked chat found.')
        return
      }
      entity = linkedChat
    }

    const reverse = await consola.prompt('Reverse?', {
      type: 'confirm',
      initial: false,
    })

    let i = 0

    try {
      for await (const msg of core.client.iterMessages(entity, {
        // offsetDate: earliestMessage?.raw.date,
        reverse,
      })) {
        messages.push(convertApiMessage(entity, msg))

        i++
        if (messages.length >= 500) {
          console.info(`Saved ${i} messages in total.`)
          await commit()
        }
      }
    } catch (error: any) {
      console.error(error)
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
