import type { CfProperties, ExecutionContext, Request } from '@cloudflare/workers-types'

declare module 'h3' {
  interface H3EventContext {
    cf: CfProperties
    cloudflare: {
      request: Request
      env: {
        DB?: D1Database
        tackpad_db: D1Database
        ASSETS: Fetcher
        TACKPAD_ASSETS: R2Bucket
      }
      context: ExecutionContext
    }
    // Populated by server/middleware/auth.ts on every request
    session: {
      profileId: string
      username: string | null
      isAnonymous: boolean
    }
  }
}

declare module 'nitropack' {
  interface RuntimeConfig {
    sessionPassword: string
    websocketUrl: string
    oauth: {
      google: { clientId: string, clientSecret: string }
      github: { clientId: string, clientSecret: string }
    }
    bucket: string
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NUXT_BUCKET?: string
    }
  }
}
