import { nanoid } from 'nanoid'
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import { useSecurityStore } from '~/stores/security'
import type {
  BoardItem,
  StickyNote,
  TodoList,
  LinkItem,
  Timer,
  TextWidget,
  SecretNoteWidget,
  SecretKeyValueWidget,
  ImageWidget,
  AudioWidget,
  FileWidget,
  Tacklet,
} from '~/shared/types/board'

const KIND_LABEL: Partial<Record<BoardItem['kind'], string>> = {
  note:    'StickyNote',
  todo:    'TodoList',
  link:    'LinkCard',
  timer:   'Timer',
  text:    'TextBlock',
  secret_note: 'SecretNote',
  secret_kv: 'SecretKeys',
  image:   'Image',
  audio:   'Audio',
  file:    'File',
  tacklet: 'Tacklet',
  group:   'Group',
}

/**
 * Creates new widgets at the current viewport center.
 * All calls go through boardStore.addItem → Yjs → observer → Pinia.
 */
export function useWidgetFactory() {
  const boardStore = useBoardStore()
  const authStore = useAuthStore()
  const securityStore = useSecurityStore()

  function getCenter() {
    const s = boardStore.scale
    return {
      x: -boardStore.translateX / s,
      y: -boardStore.translateY / s,
    }
  }

  function base(kind: BoardItem['kind'], width: number, height: number, pos?: { x: number; y: number }) {
    const { x, y } = pos ?? getCenter()
    const profileId = authStore.profile?.id ?? 'anonymous'
    const now = new Date().toISOString()
    const count = [...boardStore.items.values()].filter(it => it.kind === kind).length
    const label = KIND_LABEL[kind] ?? kind
    return {
      id: `${kind.toUpperCase()}-${nanoid(10)}`,
      kind,
      x_position: x - width / 2,
      y_position: y - height / 2,
      width,
      height,
      lock: false,
      displayName: `${label}${count + 1}`,
      createdAt: now,
      createdBy: profileId,
      lastUpdatedAt: now,
      lastUpdatedBy: profileId,
    }
  }

  function createNote(initialText?: string, pos?: { x: number; y: number }): StickyNote {
    const text = initialText
      ? '<p>' + initialText.replace(/\n/g, '</p><p>') + '</p>'
      : ''
    const item: StickyNote = {
      ...base('note', 216, 216, pos),
      kind: 'note',
      content: { text, color: '#FDE68A' },
    }
    boardStore.addItem(item)
    return item
  }

  function createTodo(initialTasks?: string[], pos?: { x: number; y: number }): TodoList {
    const tasks = (initialTasks ?? []).map(content => ({
      task_id: nanoid(10),
      content,
      completed: false,
    }))
    const item: TodoList = {
      ...base('todo', 240, 280, pos),
      kind: 'todo',
      content: { title: 'To-do', tasks },
    }
    boardStore.addItem(item)
    return item
  }

  function createLink(url = '', pos?: { x: number; y: number }): LinkItem {
    const item: LinkItem = {
      ...base('link', 280, 160, pos),
      kind: 'link',
      content: { url, title: null, description: null, image: null, oEmbed: null },
    }
    boardStore.addItem(item)
    return item
  }

  function createTimer(pos?: { x: number; y: number }): Timer {
    const item: Timer = {
      ...base('timer', 200, 220, pos),
      kind: 'timer',
      content: { timerType: 'Focus', duration: 25 * 60 },
    }
    boardStore.addItem(item)
    return item
  }

  function createText(initialText?: string, pos?: { x: number; y: number }): TextWidget {
    const item: TextWidget = {
      ...base('text', 200, 80, pos),
      kind: 'text',
      content: { text: initialText ?? 'Double-click to edit' },
    }
    boardStore.addItem(item)
    return item
  }

  async function ensureVaultBoard() {
    try {
      await $fetch('/api/board/vault', { method: 'POST' })
    }
    catch {
      // Best-effort: encrypted items can still be created on the current board.
    }
  }

  async function createSecretNote(pos?: { x: number; y: number }): Promise<SecretNoteWidget> {
    await ensureVaultBoard()
    const encrypted = await securityStore.encryptForRecipients({ text: '' }, [])
    const item: SecretNoteWidget = {
      ...base('secret_note', 280, 220, pos),
      kind: 'secret_note',
      content: encrypted,
    }
    boardStore.addItem(item)
    return item
  }

  async function createSecretKeyValue(pos?: { x: number; y: number }): Promise<SecretKeyValueWidget> {
    await ensureVaultBoard()
    const encrypted = await securityStore.encryptForRecipients({
      entries: [{ id: nanoid(8), key: '', value: '' }],
    }, [])
    const item: SecretKeyValueWidget = {
      ...base('secret_kv', 320, 240, pos),
      kind: 'secret_kv',
      content: encrypted,
    }
    boardStore.addItem(item)
    return item
  }

  function createImage(
    url = '',
    alt = '',
    pos?: { x: number; y: number },
    meta?: { uploadId?: string | null, fileName?: string | null, fileSize?: number | null, mimeType?: string | null, caption?: string | null },
    size?: { width: number, height: number },
  ): ImageWidget {
    const width = size?.width ?? 240
    const height = size?.height ?? 200
    const item: ImageWidget = {
      ...base('image', width, height, pos),
      kind: 'image',
      content: {
        url,
        alt,
        caption: meta?.caption ?? null,
        uploadId: meta?.uploadId ?? null,
        fileName: meta?.fileName ?? null,
        fileSize: meta?.fileSize ?? null,
        mimeType: meta?.mimeType ?? null,
      },
    }
    boardStore.addItem(item)
    return item
  }

  function createAudio(
    url = '',
    fileName = '',
    meta?: { uploadId?: string | null, fileSize?: number | null, mimeType?: string | null },
  ): AudioWidget {
    const item: AudioWidget = {
      ...base('audio', 280, 100),
      kind: 'audio',
      content: {
        url,
        fileName,
        uploadId: meta?.uploadId ?? null,
        fileSize: meta?.fileSize ?? null,
        mimeType: meta?.mimeType ?? null,
      },
    }
    boardStore.addItem(item)
    return item
  }

  function createFile(
    url = '',
    fileName = '',
    fileType: string | null = null,
    fileSize: number | null = null,
    meta?: { uploadId?: string | null },
  ): FileWidget {
    const item: FileWidget = {
      ...base('file', 240, 80),
      kind: 'file',
      content: { url, fileName, fileType, fileSize, uploadId: meta?.uploadId ?? null },
    }
    boardStore.addItem(item)
    return item
  }

  function createTacklet(
    tackletId = '',
    tackletUrl = '',
    options?: { width?: number; height?: number; data?: Record<string, unknown>; displayName?: string },
  ): Tacklet {
    const width = options?.width ?? 320
    const height = options?.height ?? 240
    const item: Tacklet = {
      ...base('tacklet', width, height),
      kind: 'tacklet',
      content: { tackletId, tackletUrl, data: options?.data ?? {} },
    }
    if (options?.displayName) item.displayName = options.displayName
    boardStore.addItem(item)
    return item
  }

  async function createAtPosition(kind: BoardItem['kind'], pos: { x: number; y: number }) {
    const creators: Partial<Record<BoardItem['kind'], (pos: { x: number; y: number }) => void | Promise<void>>> = {
      note:  (p) => createNote(undefined, p),
      todo:  (p) => createTodo(undefined, p),
      link:  (p) => createLink('', p),
      timer: (p) => createTimer(p),
      text:  (p) => createText(undefined, p),
      secret_note: (p) => createSecretNote(p),
      secret_kv: (p) => createSecretKeyValue(p),
    }
    await creators[kind]?.(pos)
  }

  return {
    createNote, createTodo, createLink, createTimer,
    createText, createSecretNote, createSecretKeyValue,
    createImage, createAudio, createFile, createTacklet,
    createAtPosition,
  }
}
