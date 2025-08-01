import { TelegramClient } from 'teleproto'
import { Logger, LogLevel } from 'teleproto/extensions/Logger'
import { StringSession } from 'teleproto/sessions'
import {
  normalizeCallbackable,
  type Awaitable,
  type Callbackable,
} from '../utils/general'
import type { UserAuthParams } from 'teleproto/client/auth'

export interface CoreOptions {
  apiId: number
  apiHash: string
  phoneNumber: string
  onPhoneCode: Callbackable<
    Awaitable<string | number>,
    [isCodeViaApp?: boolean]
  >
  password?: Callbackable<Awaitable<string>, [hint?: string]>
  session?: string
  logLevel?: LogLevel
}

export async function createCore(options: CoreOptions): Promise<Core> {
  const core = new Core(options)
  await core.client.connect()
  return core
}

export class Core {
  options: CoreOptions
  client: TelegramClient
  session: StringSession
  authParams: UserAuthParams

  constructor(options: CoreOptions) {
    this.options = options
    this.session = new StringSession(options.session || '')
    const logger = new Logger(options.logLevel || LogLevel.ERROR)
    this.client = new TelegramClient(
      this.session,
      this.options.apiId,
      this.options.apiHash,
      { baseLogger: logger },
    )
    this.authParams = {
      phoneNumber: options.phoneNumber,
      async phoneCode(isCodeViaApp?: boolean) {
        const code = await normalizeCallbackable(options.onPhoneCode)(
          isCodeViaApp,
        )
        return String(code)
      },
      async password(hint) {
        if (!options.password) throw new Error('Password is required')
        return await normalizeCallbackable(options.password)(hint)
      },
      onError(err: Error) {
        console.error(err)
      },
    }
  }

  async signIn(): Promise<string> {
    const signed = await this.client.isUserAuthorized()
    if (!signed) {
      const credentials = {
        apiId: this.client.apiId,
        apiHash: this.client.apiHash,
      }
      await this.client.signInUser(credentials, this.authParams)
    }
    return this.session.save()
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.client.destroy()
  }
}
