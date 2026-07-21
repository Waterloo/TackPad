declare module '#auth-utils' {
  interface User {
    profileId: string
    username: string | null
    isAnonymous: boolean
  }
}

export {}
