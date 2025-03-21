const PUBLIC_ROUTES = ['/api/_auth', '/api/board', '/api/bookmark','/api/metadata','/api/save','/api/settings']

export default defineEventHandler(async (event) => {
  // Skip auth check during prerendering
  if (process.env.prerender) {
    return
  }
  
  // Only apply to API routes
  if (!event.path.startsWith('/api/')) {
    return
  }
  
  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => {
    if (typeof route === 'string') {
      return event.path.startsWith(route)
    }
    return event.path === route.path && event.method === route.method
  })
  
  try {
    // Always try to get session, regardless of route type
    let session = null
    try {
      session = await getUserSession(event)
    } catch (e) {
      // If we can't get a session and this is a protected route, throw an error
      if (!isPublicRoute) {
        throw createError({
          statusCode: 401,
          message: 'Unauthorized - No valid session'
        })
      }
      // For public routes, just continue with no session
    }
    
    // Set default context with no auth
    event.context = event.context || {}
    event.context.session = {
      user: null,
      secure: {
        profileId: null,
        username: null
      }
    }
    
    // If we have a session, try to get the profile
    if (session?.user?.providerID) {
      const db = useDrizzle()
      const profile = await db.query.PROFILE.findFirst({
        where: eq(tables.PROFILE.providerID, session.user.providerID.toString())
      })
      
      // Update context with available user data
      event.context.session = {
        user: session.user,
        secure: {
          profileId: profile?.id || null,
          username: profile?.username || null
        }
      }
    }
    
    // For protected routes, ensure we have a valid user profile
    if (!isPublicRoute && !event.context.session.secure.profileId) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized - No valid profile'
      })
    }

  } catch (error) {
    console.error('Auth middleware error:', error)
    throw error
  }
})