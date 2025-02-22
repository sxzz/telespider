import assert from 'node:assert'
import process from 'node:process'
import consola from 'consola'
import { Api } from 'telegram'
import { insertMessages, type DbMessageInsert } from '../../db/models'
import { convertApiMessage } from '../../services/message'
import { initCli } from '../init'
import type { Core } from '../../core'
import type { Entity } from 'telegram/define'

export async function msg() {
  await using context = await initCli()
  const { core } = context

  const dialogs = await Array.fromAsync(core.client.iterDialogs())
  const idx = await consola.prompt('Select a dialog:', {
    type: 'select',
    options: dialogs.map((dialog, i) => ({
      label: dialog.title || '(Unnamed)',
      value: String(i),
    })),
  })

  if (idx == null) return
  const dialog = dialogs[Number(idx)]

  let entity = dialog.entity
  assert(entity)
  if (
    entity?.className === 'Channel' &&
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

  // const earliestMessage = reverse
  //   ? undefined
  //   : await getEarliestMessage(entityId)

  let messages: DbMessageInsert[] = []
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

        //   const shouldContinue = await consola.prompt(
        //     `Saved ${i} messages. Press Enter to continue:`,
        //     { type: 'confirm' },
        //   )
        //   if (!shouldContinue) break
      }
    }
  } catch (error: any) {
    console.error(error)
  }
  await commit()

  process.exit(0)

  async function commit() {
    if (!messages.length) return
    await insertMessages(messages)
    messages = []
  }
}

// async function getEarliestMessage(entityId: string) {
//   const [first] = await db
//     .select()
//     .from(messagesTable)
//     .where(eq(messagesTable.entityId, String(entityId)))
//     .orderBy(asc(messagesTable.messageId))
//     .limit(1)
//   return first as typeof messagesTable.$inferSelect | undefined
// }

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
