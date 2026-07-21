import type { BoardItem } from './board'

export interface Checkpoint {
  id: string
  boardId: string
  itemId: string
  content: BoardItem          // parsed JSON snapshot
  createdBy: string | null
  createdByUsername: string | null
  createdAt: string
}

export interface Comment {
  id: string
  boardId: string
  itemId: string
  checkpointId: string | null
  authorId: string | null
  authorUsername: string | null
  content: string             // text with @[label](type:id) markers
  createdAt: string
}
