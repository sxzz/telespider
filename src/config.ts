import process from 'node:process'
import { defu } from 'defu'
import dotenv from 'dotenv'
import { loadConfig as unconfig } from 'unconfig'
import type { RequiredDeep } from 'type-fest'

export function loadEnv() {
  dotenv.config({
    path: ['.env.local', '.env'],
  })
}

export interface Config {
  auth?: {
    apiId?: number
    apiHash?: string
    phoneNumber?: string
    session?: string
  }
  db?: {
    url?: string
  }
}

export type ConfigResolved = RequiredDeep<Config>

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

  loadEnv()
  const defaultConfig: ConfigResolved = {
    auth: {
      apiId: +(process.env.TELESPIDER_AUTH_API_ID ?? 0),
      apiHash: process.env.TELESPIDER_AUTH_API_HASH ?? '',
      phoneNumber: process.env.TELESPIDER_AUTH_PHONE_NUMBER ?? '',
      session: process.env.TELESPIDER_AUTH_SESSION ?? '',
    },
    db: {
      url: process.env.TELESPIDER_DATABASE_URL ?? '',
    },
  }
  return defu(config, defaultConfig)
}
