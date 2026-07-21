export type BoardAccessLevel = 'public' | 'private' | 'view_only'

export type BoardRole = 'owner' | 'editor' | 'viewer'

export interface BoardAccessEntry {
  profileId: string
  role: BoardRole
  lastAccessed: string | null
  createdAt: string
  profile?: {
    username: string | null
    firstName: string | null
    email: string | null
  }
}
