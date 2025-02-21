import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { MeiliSearch, type Index } from 'meilisearch'
import { loadConfig } from '../config'
import type { messageTable } from './models/message'

// eslint-disable-next-line import/no-mutable-exports
export let db: NodePgDatabase<Record<string, never>>
// eslint-disable-next-line import/no-mutable-exports
export let indexer: Index<typeof messageTable.$inferInsert>

export async function initDb() {
  if (db) return db
  const config = await loadConfig()
  return (db = drizzle(config.db.url, {
    casing: 'snake_case',
  }))
}

export async function initMeiliSearch() {
  const ms = new MeiliSearch({
    host: 'http://127.0.0.1:7700',
    apiKey: 'masterKey',
  })
  indexer = ms.index<typeof messageTable.$inferInsert>('messages')
  await indexer.updateFilterableAttributes(['title'])
  await indexer.updateSortableAttributes(['raw.date'])
  return indexer
}
