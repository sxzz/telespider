import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { underline } from 'ansis'
import consola from 'consola'
import { loadConfig, type ConfigResolved } from '../config'
import { createCore, type Core } from '../core'
import { initDb, initMeiliSearch } from '../db'

consola.options.formatOptions.date = false

export async function initCli(): Promise<{
  config: ConfigResolved
  core: Core
  [Symbol.asyncDispose]: () => Promise<void>
}> {
  const config = await loadConfig()
  await initDb()
  await initMeiliSearch()

  const core = await createCore({
    apiId: config.auth.apiId,
    apiHash: config.auth.apiHash,
    phoneNumber: config.auth.phoneNumber,
    session: config.auth.session,
    onPhoneCode() {
      return consola
        .prompt('Enter the code you received:', {
          type: 'text',
          cancel: 'reject',
        })
        .catch(() => process.exit(1))
    },
    password(hint) {
      const hintText = hint?.trim() ? ` (hint: ${underline(hint)})` : ''
      return consola.prompt(`Enter your password${hintText}:`, {
        type: 'text',
      })
    },
  })

  await core.signIn()
  await writeFile('.session', core.session.save())
  consola.success('You are now signed in!')

  return {
    config,
    core,
    [Symbol.asyncDispose]() {
      return core[Symbol.asyncDispose]()
    },
  }
}
