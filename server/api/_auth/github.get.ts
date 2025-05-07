import { nanoid } from 'nanoid'
import { useDrizzle, tables, eq } from '~/server/utils/drizzle'

// For GitHub handler
export default defineOAuthGitHubEventHandler({
  config: {
    scope: ['email', 'profile']
  },
  async onSuccess(event, {user}) {
    // Check if a profile with this providerID exists
    const db = useDrizzle()
    const existingProfile = await db.query.PROFILE.findFirst({
      where: eq(tables.PROFILE.providerID, user.id.toString())
    })
    
    let profileId;
    let username = null;
    
    // If no profile exists, create one
    if (!existingProfile) {
      profileId = nanoid();
      await db.insert(tables.PROFILE).values({
        id: profileId,
        firstName: user.login || '',
        username: null,
        email: user.email,
        authProvider: 'github',
        providerID: user.id.toString(),
        createdAt: new Date().toISOString()
      })
    } else {
      // Use existing profile's ID and username if it exists
      profileId = existingProfile.id;
      username = existingProfile.username;
    }
    
    // Add profileId and username to user session
    await setUserSession(event, {
      user: {
        name: user.login,
        username: username,
        providerID: user.id,
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