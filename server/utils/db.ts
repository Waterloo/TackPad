import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from '../db/schema'

export function getD1Database(event: H3Event) {
  const env = event.context.cloudflare?.env
  const d1 = env?.tackpad_db ?? env?.DB

  if (!d1) {
    throw createError({
      statusCode: 500,
      message: 'Cloudflare D1 binding is unavailable. Expected `tackpad_db` (or legacy `DB`) on event.context.cloudflare.env.',
    })
  }

  return d1
}

export function useDrizzle(event: H3Event) {
  const d1 = getD1Database(event)
  return drizzle(d1, { schema })
}

export { schema }
