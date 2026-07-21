export type NotificationType = 'mention_user'

export interface NotificationData {
  mentionedBy: string
  mentionedByUsername: string
  boardId: string
  boardTitle: string
  itemId: string
  itemKind: string
  itemDisplayName: string
  context: string            // Surrounding text snippet for preview
  isComment?: boolean        // true when triggered by a comment mention
  commentId?: string         // the comment that triggered this notification
}

export interface Notification {
  id: string
  recipientId: string
  type: NotificationType
  data: NotificationData
  boardId: string | null
  read: boolean
  createdAt: string
}
