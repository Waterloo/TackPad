import type { BoardItem } from '../types/board'

/**
 * Extracts a plain-text string from a BoardItem for FTS5 indexing.
 * Returns null for widget kinds that have no meaningful text content.
 */
export function extractItemText(item: BoardItem): string | null {
  switch (item.kind) {
    case 'note':
      // Strip HTML tags from TipTap output
      return item.content.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null

    case 'todo': {
      const parts = [item.content.title]
      for (const task of item.content.tasks) {
        if (task.content) parts.push(task.content)
      }
      return parts.filter(Boolean).join(' ') || null
    }

    case 'link':
      return [item.content.title, item.content.description, item.content.url]
        .filter(Boolean)
        .join(' ') || null

    case 'text':
      return item.content.text || null

    case 'secret_note':
    case 'secret_kv':
      return null

    case 'image':
      return item.content.alt || null

    case 'audio':
      return item.content.fileName || null

    case 'file':
      return item.content.fileName || null

    case 'timer':
    case 'tacklet':
      return null

    default:
      return null
  }
}
