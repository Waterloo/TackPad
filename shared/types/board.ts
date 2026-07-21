import type { BoardAccessLevel } from './access'

// ---------------------------------------------------------------------------
// Widget base
// ---------------------------------------------------------------------------
export interface WidgetBase {
  id: string
  kind: WidgetKind
  x_position: number
  y_position: number
  width: number
  height: number
  lock: boolean
  displayName: string
  createdAt: string      // ISO 8601 timestamp
  createdBy: string      // profile ID of creator
  lastUpdatedAt: string  // ISO 8601 timestamp of most recent local edit
  lastUpdatedBy: string  // profile ID of last editor
  // { [emoji]: profileId[] } — each unique emoji tracks who voted for it
  reactions?: Record<string, string[]>
  /** If this widget belongs to a group, its parent GroupItem id. */
  parentGroupId?: string
}

export type WidgetKind =
  | 'note'
  | 'todo'
  | 'link'
  | 'timer'
  | 'text'
  | 'secret_note'
  | 'secret_kv'
  | 'image'
  | 'audio'
  | 'file'
  | 'tacklet'
  | 'group'

export type BoardType = 'standard' | 'vault'

export interface EncryptedRecipientEnvelope {
  profileId: string
  wrappedKey: string
  addedAt: string
}

export interface EncryptedContentBlob {
  version: 1
  algorithm: 'aes-gcm'
  ciphertext: string
  iv: string
  recipients: EncryptedRecipientEnvelope[]
}

export interface SecretNoteValue {
  text: string
}

export interface SecretKeyValueEntry {
  id: string
  key: string
  value: string
}

export interface SecretKeyValueData {
  entries: SecretKeyValueEntry[]
}

// ---------------------------------------------------------------------------
// Widget types
// ---------------------------------------------------------------------------
export interface StickyNote extends WidgetBase {
  kind: 'note'
  content: {
    text: string    // HTML from TipTap
    color: string   // hex colour
  }
}

export interface TodoTask {
  task_id: string
  content: string
  completed: boolean
}

export interface TodoList extends WidgetBase {
  kind: 'todo'
  content: {
    title: string
    tasks: TodoTask[]
  }
}

export interface LinkItem extends WidgetBase {
  kind: 'link'
  content: {
    url: string
    title: string | null
    description: string | null
    image: string | null
    oEmbed: string | null  // raw oEmbed HTML
  }
}

export type TimerMode = 'Focus' | 'Short Break' | 'Long Break'

export interface Timer extends WidgetBase {
  kind: 'timer'
  content: {
    timerType: TimerMode
    duration: number  // seconds
  }
}

export interface TextWidget extends WidgetBase {
  kind: 'text'
  content: {
    text: string
  }
}

export interface SecretNoteWidget extends WidgetBase {
  kind: 'secret_note'
  content: EncryptedContentBlob
}

export interface SecretKeyValueWidget extends WidgetBase {
  kind: 'secret_kv'
  content: EncryptedContentBlob
}

export interface ImageWidget extends WidgetBase {
  kind: 'image'
  content: {
    url: string
    alt: string | null
    caption?: string | null
    uploadId?: string | null
    fileName?: string | null
    fileSize?: number | null
    mimeType?: string | null
  }
}

export interface AudioWidget extends WidgetBase {
  kind: 'audio'
  content: {
    url: string
    fileName: string | null
    uploadId?: string | null
    fileSize?: number | null
    mimeType?: string | null
  }
}

export interface FileWidget extends WidgetBase {
  kind: 'file'
  content: {
    url: string
    fileName: string
    fileType: string | null
    fileSize: number | null
    uploadId?: string | null
  }
}

export interface Tacklet extends WidgetBase {
  kind: 'tacklet'
  content: {
    tackletId: string
    tackletUrl: string
    data: Record<string, unknown>  // opaque blob stored/returned via penpal
  }
}

export interface TackletManifestAuthor {
  name: string
  url?: string
}

export interface TackletManifestV1 {
  id: string
  name: string
  url: string
  version?: string
  description?: string
  icon?: string
  tags?: string[]
  author?: TackletManifestAuthor
  // V2-compatible additive fields (optional, non-breaking)
  manifestVersion?: string
  capabilities?: string[]
  dimensions?: {
    defaultWidth?: number
    defaultHeight?: number
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
  }
}

export interface TackletBoardContext {
  boardId: string
  canEdit: boolean
  accessLevel: BoardAccessLevel
  containerType: 'board' | 'pip'
}

export interface TackletParentMethods {
  getWidgetData: () => Promise<Record<string, unknown>> | Record<string, unknown>
  setWidgetData: (data: Record<string, unknown>) => Promise<{ ok: true } | { ok: false; reason: string }>
  onResize?: (width: number, height: number) => Promise<{ ok: true } | { ok: false; reason: string }> | { ok: true } | { ok: false; reason: string }
  getWidgetId: () => Promise<string> | string
  getTheme: () => Promise<'light' | 'dark' | 'system'> | 'light' | 'dark' | 'system'
  getBoardContext: () => Promise<TackletBoardContext> | TackletBoardContext
  registerWidget: (payload?: { apiVersion?: string; capabilities?: string[] }) => Promise<{ ok: true; apiVersion: string }> | { ok: true; apiVersion: string }
}

export interface TackletChildMethods {
  onSelected?: () => Promise<void> | void
  onDeselected?: () => Promise<void> | void
  onResize?: (width: number, height: number) => Promise<void> | void
}

export interface GroupItem extends WidgetBase {
  kind: 'group'
  /** IDs of child widgets that belong to this group. */
  childIds: string[]
  label?: string
}

export type BoardItem =
  | StickyNote
  | TodoList
  | LinkItem
  | Timer
  | TextWidget
  | SecretNoteWidget
  | SecretKeyValueWidget
  | ImageWidget
  | AudioWidget
  | FileWidget
  | Tacklet
  | GroupItem

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------
export interface Board {
  id: string
  ownerId: string | null
  title: string
  boardType: BoardType
  accessLevel: BoardAccessLevel
  customUrl: string | null
  data: {
    items: Record<string, BoardItem>
  } | null
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Presence / collaboration
// ---------------------------------------------------------------------------
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface ActiveUser {
  id: string
  name: string
  color: string
  role: string
}
