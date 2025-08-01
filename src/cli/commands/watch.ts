import consola from 'consola'
import { Api } from 'teleproto'
import { NewMessage } from 'teleproto/events'
import { getPeerId } from 'teleproto/Utils'
import * as models from '../../db/models'
import { getDbEntityRaw, registerEntities } from '../../services/entity'
import { convertApiMessage } from '../../services/message'
import { initCli } from '../init'

export async function watch() {
  const context = await initCli()
  const { core } = context

  const me = await core.client.getMe()

  core.client.addEventHandler(async (event) => {
    const { message: rawMessage } = event
    console.info('New message:', rawMessage.text)

    if (!rawMessage.fromId) {
      consola.warn('No fromId in message')
      return
    }

    const peerId = +getPeerId(rawMessage.peerId, false)
    let peerEntity = getDbEntityRaw(await models.queryDbEntity(peerId))
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
    if (!peerEntity) {
      consola.warn('No entity found for peer', peerId)
      return
    }

    const message = convertApiMessage(me, peerEntity, rawMessage)
    await models.insertMessages([message])
  }, new NewMessage())

  await core.client.start(core.authParams)
}
