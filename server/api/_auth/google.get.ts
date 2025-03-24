import { nanoid } from 'nanoid'
import { useDrizzle, tables, eq } from '~/server/utils/drizzle'

// For Google handler
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
    
    let profileId;
    let username = null;
    
    // If no profile exists, create one
    if (!existingProfile && user.email) {
      profileId = nanoid();
      await db.insert(tables.PROFILE).values({
        id: profileId,
        firstName: user.name || '',
        email: user.email,
        username: null,
        providerID: user.sub,
        authProvider: 'google',
        createdAt: new Date().toISOString()
      })
    } else if (existingProfile) {
      // Use existing profile's ID and username if it exists
      profileId = existingProfile.id;
      username = existingProfile.username;
    }
    
    // Add profileId and username to user session
    await setUserSession(event, {
      user: {
        name: user.name,
        providerID: user.sub,
        username: username,
        email: user.email,
        profileId: profileId
      },
      loggedInAt: new Date()
    })
    
    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('OAuth error:', error)
    return sendRedirect(event, '/?error=oauth-error')
  }
})