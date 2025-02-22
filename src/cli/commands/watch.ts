import { Api } from 'telegram'
import { NewMessage } from 'telegram/events'
import { getPeerId } from 'telegram/Utils'
import * as models from '../../db/models'
import { getDbEntityRaw, registerEntities } from '../../services/entity'
import { convertApiMessage } from '../../services/message'
import { initCli } from '../init'

export async function watch() {
  const context = await initCli()
  const { core } = context

  core.client.addEventHandler(async (event) => {
    const { message: rawMessage } = event
    if (!rawMessage.fromId) return

    // console.info('New message', rawMessage)

    const peerId = getPeerId(rawMessage.peerId)
    let peerEntity = getDbEntityRaw(
      await models.queryDbEntity(getPeerId(rawMessage.peerId)),
    )
    if (!peerEntity) {
      const messages = await core.client.invoke(
        new Api.messages.GetMessages({
          id: [new Api.InputMessageID({ id: rawMessage.id })],
        }),
      )
      if (messages.className === 'messages.MessagesNotModified') return
      await registerEntities(core, messages.users)
      const entity = messages.users.find((user) => user.id.eq(peerId))
      peerEntity = entity
    }
    if (!peerEntity) return

    const message = convertApiMessage(peerEntity, rawMessage)
    await models.insertMessages([message])
  }, new NewMessage())

  await core.client.start(core.authParams)
}
