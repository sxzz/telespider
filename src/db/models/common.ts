import { timestamp } from 'drizzle-orm/pg-core'

export const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .notNull()
    .$onUpdate(() => new Date()),
}
