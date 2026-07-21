import { resolveAnonymousSession } from '../utils/auth'

/**
 * Resolves the user session for every /api/* request.
 * Checks OAuth session first, falls back to anonymous cookie-based identity.
 * Sets event.context.session so all handlers can rely on it being present.
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Only run for API routes — static assets and pages don't need a session
  if (!path.startsWith('/api/')) return

  // Skip auth resolution for OAuth callback routes (handled by nuxt-auth-utils)
  if (path.startsWith('/api/_auth/')) return

  // 1. Check for OAuth session via nuxt-auth-utils
  const oauthSession = await getUserSession(event).catch(() => null)
  if (oauthSession?.user?.profileId) {
    event.context.session = {
      profileId: oauthSession.user.profileId,
      username: oauthSession.user.username,
      isAnonymous: false,
    }
    return
  }

  // 2. Fall through to existing anonymous resolution
  const session = await resolveAnonymousSession(event)
  event.context.session = session
})
