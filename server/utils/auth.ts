import type { H3Event } from 'h3'
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from './db'

/**
 * Throws 403 if the current session has no username set.
 * Use this to guard social/identity actions (comments, mentions, invites, etc.).
 */
export function requireUsername(event: H3Event): void {
  const session = event.context.session
  if (!session?.username) {
    throw createError({ statusCode: 403, statusMessage: 'Username required' })
  }
}

/**
 * Throws 403 if the current session is anonymous (no OAuth link).
 * Reserved for future use (file uploads, paid features).
 */
export function requireOAuth(event: H3Event): void {
  const session = event.context.session
  if (session?.isAnonymous !== false) {
    throw createError({ statusCode: 403, statusMessage: 'Account required' })
  }
}

const COOKIE_NAME = 'user-token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400  // 400 days

/**
 * SHA-256 hash of a token string, returned as hex.
 * Uses the Web Crypto API available in Cloudflare Workers.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Reads the anonymous user-token cookie from the request.
 */
export function getAnonymousToken(event: H3Event): string | undefined {
  return getCookie(event, COOKIE_NAME)
}

/**
 * Sets the anonymous user-token cookie on the response.
 */
export function setAnonymousToken(event: H3Event, token: string): void {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/**
 * Resolves the current anonymous session:
 * - If a valid user-token cookie exists, looks up the matching profile.
 * - If no cookie exists (or no profile found), creates a new profile and sets the cookie.
 *
 * Returns { profileId, username, isAnonymous }.
 */
export async function resolveAnonymousSession(event: H3Event) {
  const db = useDrizzle(event)
  let token = getAnonymousToken(event)

  if (token) {
    const hash = await hashToken(token)
    const profile = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.anonymousToken, hash))
      .get()

    if (profile) {
      return {
        profileId: profile.id,
        username: profile.username,
        isAnonymous: true,
      }
    }
    // Token in cookie but no matching profile — fall through to create one
  }

  // Create a new anonymous profile
  token = nanoid()
  const hash = await hashToken(token)
  const profileId = `usr_${nanoid()}`

  await db.insert(schema.profiles).values({
    id: profileId,
    anonymousToken: hash,
  })

  setAnonymousToken(event, token)

  return {
    profileId,
    username: null,
    isAnonymous: true,
  }
}
