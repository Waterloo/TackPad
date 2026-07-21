/**
 * Validates required environment variables at server startup.
 * Throws hard in production so a misconfigured deploy fails fast
 * rather than silently serving broken sessions.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  if (process.env.NODE_ENV === 'production') {
    if (!config.sessionPassword) {
      throw new Error(
        '[TackPad] NUXT_SESSION_PASSWORD is not set. '
        + 'Sessions cannot be encrypted. Set this environment variable before deploying.',
      )
    }

    const missing: string[] = []
    if (!config.bucket) missing.push('NUXT_BUCKET')

    if (missing.length > 0) {
      throw new Error(`[TackPad] Missing storage env vars: ${missing.join(', ')}`)
    }
  }
})
