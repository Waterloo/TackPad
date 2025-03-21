// When a user first creates content (their first board)
import { nanoid } from 'nanoid'
import { createHash } from 'node:crypto';


export const setupUserToken =(event) => {
    // Check if user already has a token
    let userToken = getCookie(event, 'user-token')
    
    // If no token exists, create one
    if (!userToken) {
      userToken = nanoid()
      setCookie(event, 'user-token', userToken)
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