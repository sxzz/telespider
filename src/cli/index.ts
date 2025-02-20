import process from 'node:process'
import { underline } from 'ansis'
import consola from 'consola'
import { eq } from 'drizzle-orm'
import { readConfig, saveConfig } from '../config'
import { createCore } from '../core'
import { db } from '../db'
import { messagesTable } from '../db/schema'

async function main() {
  const config = await readConfig()
  await using core = await createCore({
    apiId: config.apiId,
    apiHash: config.apiHash,
    phoneNumber: config.phoneNumber,
    session: config.session,
    onPhoneCode() {
      return consola.prompt('Enter the code you received:', { type: 'text' })
    },
    password(hint) {
      return consola.prompt(`Enter your password (hint: ${underline(hint)}):`, {
        type: 'text',
      })
    },
  })

  await core.signIn()
  config.session = core.session.save()
  await saveConfig()

  consola.success('You are now signed in!')

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

  const reverse = await consola.prompt('Reverse?', {
    type: 'confirm',
    initial: false,
  })

  let i = 0
  for await (const msg of core.client.iterMessages(dialog.entity, {
    reverse,
  })) {
    const peerId = await core.client.getPeerId(msg.peerId)
    const id = `${peerId}:${msg.id}`

    const count = await db.$count(messagesTable, eq(messagesTable.id, id))
    if (count > 0) continue

    const media =
      msg.media && msg.media.className !== 'MessageMediaWebPage'
        ? await core.client.downloadMedia(msg.media)
        : undefined
    const user: typeof messagesTable.$inferInsert = {
      id,
      peerId,
      messageId: msg.id,
      text: msg.text,
      data: msg,
      media,
    }
    await db.insert(messagesTable).values(user)

    i++
    if (i % 500 === 0) {
      const shouldContinue = await consola.prompt('Press Enter to continue:', {
        type: 'confirm',
      })
      if (!shouldContinue) break
    }
  }

  process.exit(0)
}

main()
