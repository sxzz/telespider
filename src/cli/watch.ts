import { Api } from 'telegram'
import { NewMessage } from 'telegram/events'
import { getPeerId } from 'telegram/Utils'
import { insertMessages } from '../db/models'
import { queryDbEntity } from '../db/models/entity'
import { getDbEntityRaw, registerEntities } from '../services/enitity'
import { convertApiMessage } from '../services/message'
import { initCli } from './init'

main()

async function main() {
  const context = await initCli()
  const { core } = context

  core.client.addEventHandler(async (event) => {
    const { message: rawMessage } = event
    if (!rawMessage.fromId) return

    // console.info('New message', rawMessage)

    const peerId = getPeerId(rawMessage.peerId)
    let peerEntity = getDbEntityRaw(
      await queryDbEntity(getPeerId(rawMessage.peerId)),
    )
    if (!peerEntity) {
      const messages = await core.client.invoke(
        new Api.messages.GetMessages({
          id: [new Api.InputMessageID({ id: rawMessage.id })],
        }),
      )
      if (messages.className === 'messages.MessagesNotModified') return
      await registerEntities(messages.users)
      const entity = messages.users.find((user) => user.id.eq(peerId))
      peerEntity = entity
    }
    if (!peerEntity) return

    const message = convertApiMessage(peerEntity, rawMessage)
    await insertMessages([message])
  }, new NewMessage())

  await core.client.start(core.authParams)
}
