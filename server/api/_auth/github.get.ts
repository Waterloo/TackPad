import { nanoid } from 'nanoid'
import { useDrizzle, tables, eq } from '~/server/utils/drizzle'

export default defineOAuthGitHubEventHandler({ config: {
    scope: ['email', 'profile']
  },
    async onSuccess(event, {user}) {
      // Check if a profile with this providerID exists
      const db = useDrizzle()
      const existingProfile = await db.query.PROFILE.findFirst({
        where: eq(tables.PROFILE.providerID, user.id.toString())
      })

      await setUserSession(event, {
        user: {
          name: user.login,
          username: null,
          providerID: user.id,
          email: user.email
        },
        loggedInAt: new Date()
      })

      // If no profile exists, create one
      if (!existingProfile) {
        await db.insert(tables.PROFILE).values({
          id: nanoid(),
          firstName: user.login || '',
          username: null,
          email: user.email,
          authProvider: 'github',
          providerID: user.id.toString(),
          createdAt: new Date().toISOString()
        })
      }
      
      return sendRedirect(event, '/')
    },
    onError(event, error) {
        console.error('OAuth error:', error)
        return sendRedirect(event, '/?error=oauth-error')
    }
  })