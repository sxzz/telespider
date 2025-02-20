import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'

export const db: LibSQLDatabase<Record<string, never>> = drizzle('file:data.db')
