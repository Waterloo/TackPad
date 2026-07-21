export interface Profile {
  id: string
  firstName: string | null
  username: string | null
  email: string | null
  createdAt: string
  hasEncryptionKey?: boolean
}

export interface SessionContext {
  profileId: string
  username: string | null
  isAnonymous: boolean
}
