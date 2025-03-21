// When a user first creates content (their first board)
import { nanoid } from 'nanoid'
import { createHash } from 'node:crypto';

// Maximum cookie age (400 days in seconds)
const MAX_COOKIE_AGE = 34560000; // 60 * 60 * 24 * 400

// Cookie options for consistent settings
const getCookieOptions = () => ({
  maxAge: MAX_COOKIE_AGE,
  path: '/',        
  httpOnly: true,   
  sameSite: 'lax'   
});

export const setupUserToken = (event) => {
    // Check if user already has a token
    let userToken = getCookie(event, 'user-token')
    
    // If no token exists, create one
    if (!userToken) {
      userToken = nanoid()
      
      // Set cookie with maximum reliable expiration (400 days)
      setCookie(event, 'user-token', userToken, getCookieOptions())
    } else {
      // Refresh the existing cookie's expiration without changing the value
      // This creates a rolling 400-day window that resets on each visit
      setCookie(event, 'user-token', userToken, getCookieOptions())
    }
    
    return hashToken(userToken)
}


const hashToken = (token:string) => {
  return createHash('sha256').update(token).digest('hex');
}

export const verifyUserToken = (event,hash:string) => {
    const token = getCookie(event, 'user-token')
    if (!token) return false
    return hash === hashToken(token)
}