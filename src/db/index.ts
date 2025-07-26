import consola from 'consola'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { MeiliSearch, type EnqueuedTask, type Index } from 'meilisearch'
import { loadConfig } from '../config'
import type * as models from './models/message'

// eslint-disable-next-line import/no-mutable-exports
export let db: NodePgDatabase<Record<string, never>>
// eslint-disable-next-line import/no-mutable-exports
export let indexer: Index<models.DbMessageInsert>

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
  indexer = ms.index<models.DbMessageInsert>('messages')
  const filterableAttrs = (
    (await indexer.getFilterableAttributes()) || []
  ).sort()
  const sortableAttrs = (await indexer.getSortableAttributes()).sort()

  const expectedFilterableAttrs = [
    'peerName',
    'fromUserDisplayName',
    'fwdFromName',
    'raw.fromId.className',
  ].sort()
  const expectedSortableAttrs = ['sentAt', 'fwdFromDate'].sort()
  const tasks: EnqueuedTask[] = []
  if (
    JSON.stringify(filterableAttrs) !== JSON.stringify(expectedFilterableAttrs)
  ) {
    tasks.push(
      await indexer.updateFilterableAttributes(expectedFilterableAttrs),
    )
  }
  if (JSON.stringify(sortableAttrs) !== JSON.stringify(expectedSortableAttrs)) {
    tasks.push(await indexer.updateSortableAttributes(expectedSortableAttrs))
  }
  if (tasks.length) {
    consola.info('MeiliSearch index settings updated')
    await ms.tasks.waitForTasks(tasks.map((task) => task.taskUid))
  }
  return indexer
}
