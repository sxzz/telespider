import { underline } from 'ansis'
import consola from 'consola'
import { loadConfig } from '../config'
import { createCore } from '../core'
import { initDb, initMeiliSearch } from '../db'

export async function initCli() {
  const config = await loadConfig()
  await initDb()
  await initMeiliSearch()

  const core = await createCore({
    apiId: config.auth.apiId,
    apiHash: config.auth.apiHash,
    phoneNumber: config.auth.phoneNumber,
    session: config.auth.session,
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
  consola.success('You are now signed in!')

  return {
    config,
    core,
    [Symbol.asyncDispose]() {
      return core[Symbol.asyncDispose]()
    },
  }
}
