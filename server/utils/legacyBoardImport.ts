import { nanoid } from 'nanoid'
import type {
  AudioWidget,
  BoardItem,
  FileWidget,
  ImageWidget,
  LinkItem,
  StickyNote,
  Tacklet,
  TextWidget,
  Timer,
  TimerMode,
  TodoList,
  TodoTask,
} from '../../shared/types/board'

export interface LegacyItem extends Record<string, unknown> {
  id?: unknown
  kind?: unknown
  content?: unknown
  x_position?: unknown
  y_position?: unknown
  width?: unknown
  height?: unknown
  lock?: unknown
  displayName?: unknown
  title?: unknown
}

export interface LegacyBoard {
  board_id?: unknown
  data?: {
    title?: unknown
    items?: Record<string, LegacyItem>
  } | unknown
}

export interface LegacySkippedItem {
  legacyItemId: string
  kind?: string
  reason: string
}

export interface LegacyImportResult {
  title: string
  items: Record<string, BoardItem>
  stats: {
    total: number
    imported: number
    skipped: number
  }
  skipped: LegacySkippedItem[]
}

type SupportedLegacyKind =
  | 'note'
  | 'todo'
  | 'link'
  | 'text'
  | 'timer'
  | 'image'
  | 'audio'
  | 'file'
  | 'tacklet'

interface BaseWidgetFields {
  id: string
  kind: SupportedLegacyKind
  x_position: number
  y_position: number
  width: number
  height: number
  lock: boolean
  displayName: string
  createdAt: string
  createdBy: string
  lastUpdatedAt: string
  lastUpdatedBy: string
}

const DISPLAY_LABELS: Record<SupportedLegacyKind, string> = {
  note: 'Note',
  todo: 'Todo',
  link: 'Link',
  text: 'Text',
  timer: 'Timer',
  image: 'Image',
  audio: 'Audio',
  file: 'File',
  tacklet: 'Tacklet',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseTimerMode(value: unknown): TimerMode {
  return value === 'Short Break' || value === 'Long Break' || value === 'Focus'
    ? value
    : 'Focus'
}

function parseTodoTasks(raw: unknown): TodoTask[] {
  if (!Array.isArray(raw)) return []
  const tasks: TodoTask[] = []
  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const taskId = asString(entry.task_id) ?? nanoid(10)
    tasks.push({
      task_id: taskId,
      content: asString(entry.content) ?? '',
      completed: asBoolean(entry.completed, false),
    })
  }
  return tasks
}

function createBaseWidget(
  legacy: LegacyItem,
  kind: SupportedLegacyKind,
  profileId: string,
  nowIso: string,
  kindCounters: Record<SupportedLegacyKind, number>,
): BaseWidgetFields | null {
  const x = asFiniteNumber(legacy.x_position)
  const y = asFiniteNumber(legacy.y_position)
  const width = asFiniteNumber(legacy.width)
  const height = asFiniteNumber(legacy.height)
  if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) {
    return null
  }

  kindCounters[kind] += 1
  const fallbackDisplayName = `${DISPLAY_LABELS[kind]} ${kindCounters[kind]}`
  const displayName = asString(legacy.displayName)?.trim() || fallbackDisplayName

  return {
    id: `${kind.toUpperCase()}-${nanoid(10)}`,
    kind,
    x_position: x,
    y_position: y,
    width,
    height,
    lock: asBoolean(legacy.lock, false),
    displayName,
    createdAt: nowIso,
    createdBy: profileId,
    lastUpdatedAt: nowIso,
    lastUpdatedBy: profileId,
  }
}

function convertLegacyItem(
  legacyItemId: string,
  raw: unknown,
  profileId: string,
  nowIso: string,
  kindCounters: Record<SupportedLegacyKind, number>,
): { item: BoardItem | null; skipped?: LegacySkippedItem } {
  if (!isRecord(raw)) {
    return { item: null, skipped: { legacyItemId, reason: 'Item is not an object' } }
  }

  const legacy = raw as LegacyItem
  const kind = asString(legacy.kind)
  if (!kind) {
    return { item: null, skipped: { legacyItemId, reason: 'Missing item kind' } }
  }

  if (![
    'note', 'todo', 'link', 'text', 'timer', 'image', 'audio', 'file', 'tacklet',
  ].includes(kind)) {
    return { item: null, skipped: { legacyItemId, kind, reason: `Unsupported widget kind: ${kind}` } }
  }

  const base = createBaseWidget(legacy, kind as SupportedLegacyKind, profileId, nowIso, kindCounters)
  if (!base) {
    return { item: null, skipped: { legacyItemId, kind, reason: 'Invalid geometry' } }
  }

  const content = isRecord(legacy.content) ? legacy.content : {}

  switch (kind) {
    case 'note': {
      const item: StickyNote = {
        ...base,
        kind: 'note',
        content: {
          text: asString(content.text) ?? '',
          color: asString(content.color) ?? '#FDE68A',
        },
      }
      return { item }
    }

    case 'todo': {
      const item: TodoList = {
        ...base,
        kind: 'todo',
        content: {
          title: asString(content.title) ?? 'To-do',
          tasks: parseTodoTasks(content.tasks),
        },
      }
      return { item }
    }

    case 'link': {
      const item: LinkItem = {
        ...base,
        kind: 'link',
        content: {
          url: asString(content.url) ?? '',
          title: asNullableString(content.title),
          description: asNullableString(content.description),
          image: asNullableString(content.image),
          oEmbed: null,
        },
      }
      return { item }
    }

    case 'text': {
      const item: TextWidget = {
        ...base,
        kind: 'text',
        content: {
          text: asString(content.text) ?? '',
        },
      }
      return { item }
    }

    case 'timer': {
      const rawDuration = asFiniteNumber(content.duration)
      const durationSeconds = rawDuration !== null && rawDuration > 0
        ? Math.round(rawDuration * 60)
        : 25 * 60

      const item: Timer = {
        ...base,
        kind: 'timer',
        content: {
          timerType: parseTimerMode(content.timerType),
          duration: durationSeconds,
        },
      }
      return { item }
    }

    case 'image': {
      const url = asString(content.url)
      if (!url) {
        return { item: null, skipped: { legacyItemId, kind, reason: 'Missing image URL' } }
      }

      const item: ImageWidget = {
        ...base,
        kind: 'image',
        content: {
          url,
          alt: asNullableString(legacy.title),
          caption: null,
          uploadId: null,
          fileName: null,
          fileSize: null,
          mimeType: null,
        },
      }
      return { item }
    }

    case 'audio': {
      const url = asString(content.url)
      if (!url) {
        return { item: null, skipped: { legacyItemId, kind, reason: 'Missing audio URL' } }
      }

      const item: AudioWidget = {
        ...base,
        kind: 'audio',
        content: {
          url,
          fileName: asNullableString(legacy.title),
          uploadId: null,
          fileSize: null,
          mimeType: null,
        },
      }
      return { item }
    }

    case 'file': {
      const url = asString(content.url)
      const fileName = asString(content.fileName) ?? asString(legacy.title)
      if (!url || !fileName) {
        return { item: null, skipped: { legacyItemId, kind, reason: 'Missing file URL or file name' } }
      }

      const item: FileWidget = {
        ...base,
        kind: 'file',
        content: {
          url,
          fileName,
          fileType: asNullableString(content.fileType),
          fileSize: asNullableNumber(content.fileSize),
          uploadId: null,
        },
      }
      return { item }
    }

    case 'tacklet': {
      const tackletId = asString(content.tackletId)
      const tackletUrl = asString(content.url)
      if (!tackletId || !tackletUrl) {
        return { item: null, skipped: { legacyItemId, kind, reason: 'Missing tackletId or url' } }
      }

      const item: Tacklet = {
        ...base,
        kind: 'tacklet',
        content: {
          tackletId,
          tackletUrl,
          data: isRecord(content.data) ? content.data : {},
        },
      }
      return { item }
    }
  }
}

export function convertLegacyBoard(input: unknown, profileId: string, nowIso: string): LegacyImportResult {
  if (!isRecord(input)) {
    throw new Error('Legacy board payload must be an object')
  }

  const legacyBoard = input as LegacyBoard
  const data = legacyBoard.data
  if (!isRecord(data)) {
    throw new Error('Missing legacyBoard.data')
  }

  const itemsRaw = data.items
  if (!isRecord(itemsRaw)) {
    throw new Error('Missing legacyBoard.data.items')
  }

  const title = asString(data.title)?.trim() || 'Imported Board'
  const items: Record<string, BoardItem> = {}
  const skipped: LegacySkippedItem[] = []
  const kindCounters: Record<SupportedLegacyKind, number> = {
    note: 0,
    todo: 0,
    link: 0,
    text: 0,
    timer: 0,
    image: 0,
    audio: 0,
    file: 0,
    tacklet: 0,
  }

  const entries = Object.entries(itemsRaw)
  for (const [legacyItemId, legacyItem] of entries) {
    const { item, skipped: skippedItem } = convertLegacyItem(
      legacyItemId,
      legacyItem,
      profileId,
      nowIso,
      kindCounters,
    )
    if (item) {
      items[item.id] = item
      continue
    }
    if (skippedItem) skipped.push(skippedItem)
  }

  return {
    title,
    items,
    stats: {
      total: entries.length,
      imported: Object.keys(items).length,
      skipped: skipped.length,
    },
    skipped,
  }
}
