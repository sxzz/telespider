import { NewMessage } from 'telegram/events'
import { initCli } from './init'

main()

async function main() {
  const context = await initCli()
  const { core } = context

  core.client.addEventHandler((event) => {
    console.info('New message', event.message.text)
  }, new NewMessage())

  await core.client.start(core.authParams)
}
