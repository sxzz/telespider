import process from 'node:process'
import { defineConfig } from 'drizzle-kit'
import { loadEnv } from './src/config'

loadEnv()

export default defineConfig({
  out: './drizzle',
  schema: './src/db/models',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.TELESPIDER_DATABASE_URL!,
  },
})
