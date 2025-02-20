import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import consola from 'consola'

export interface AppConfig {
  apiId: number
  apiHash: string
  phoneNumber: string
  session?: string
}

const configDir = resolve(homedir(), '.config')
const configPath = resolve(configDir, '.telespider.json')

let globalConfig: AppConfig

export function getConfig(): AppConfig {
  return globalConfig
}

export async function readConfig(): Promise<AppConfig> {
  const raw = await readFile(configPath, 'utf8').catch(() => null)
  if (!raw) return initConfig()
  return (globalConfig = JSON.parse(raw))
}

export async function saveConfig(
  config: AppConfig = globalConfig,
): Promise<void> {
  await mkdir(configDir, { recursive: true })
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  globalConfig = config
}

export async function initConfig(): Promise<AppConfig> {
  const appId = await consola.prompt('Enter your API ID:', { type: 'text' })
  const appHash = await consola.prompt('Enter your API Hash:', {
    type: 'text',
  })
  const phoneNumber = await consola.prompt('Enter your phone number:', {
    type: 'text',
  })
  const config: AppConfig = {
    apiId: Number(appId),
    apiHash: appHash,
    phoneNumber,
  }
  await saveConfig(config)
  consola.success('Configuration initialized successfully!')
  return (globalConfig = config)
}
