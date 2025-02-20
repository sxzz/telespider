import process from 'node:process'
import { defu } from 'defu'
import dotenv from 'dotenv'
import { loadConfig as unconfig } from 'unconfig'
import type { RequiredDeep } from 'type-fest'

dotenv.config({
  path: ['.env.local', '.env'],
})

export interface Config {
  auth?: {
    apiId?: number
    apiHash?: string
    phoneNumber?: string
    session?: string
  }
}

export type ConfigResolved = RequiredDeep<Config>

const defaultConfig: ConfigResolved = {
  auth: {
    apiId: +(process.env.TELESPIDER_AUTH_API_ID ?? 0),
    apiHash: process.env.TELESPIDER_AUTH_API_HASH ?? '',
    phoneNumber: process.env.TELESPIDER_AUTH_PHONE_NUMBER ?? '',
    session: process.env.TELESPIDER_AUTH_SESSION ?? '',
  },
}

export async function loadConfig(): Promise<ConfigResolved> {
  const { config } = await unconfig<Config>({
    sources: [
      {
        files: 'telespider.config',
        extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json', ''],
      },
    ],
    cwd: process.cwd(),
    defaults: {},
  })
  return defu(config, defaultConfig)
}
