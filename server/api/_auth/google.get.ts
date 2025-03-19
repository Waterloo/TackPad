import { nanoid } from 'nanoid'
import { useDrizzle, tables, eq } from '~/server/utils/drizzle'

export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile']
  },
  async onSuccess(event, {user}) {
  
    // Check if a profile with this providerID exists
    const db = useDrizzle()
    const existingProfile = await db.query.PROFILE.findFirst({
      where: eq(tables.PROFILE.providerID, user.sub)
    })
  
    await setUserSession(event, {
      user: {
        name: user.name,
        providerID: user.sub,
        username: null,
        email: user.email,
      },
      loggedInAt: new Date()
    })
    // If no profile exists, create one
    if (!existingProfile && user.email) {
      await db.insert(tables.PROFILE).values({
        id: nanoid(),
        firstName: user.name || '',
        email: user.email,
        username: null,
        providerID: user.sub,
        authProvider: 'google',
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