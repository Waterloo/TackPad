import { defineStore } from 'pinia'
import { useBoardStore } from '~/stores/board'
import { useWidgetFactory } from '~/composables/widgets/useWidgetFactory'
import type { Tacklet, TackletManifestV1 } from '~/shared/types/board'

const MAX_WIDGET_DATA_BYTES = 64 * 1024

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function safeJsonSize(value: unknown): number {
  const json = JSON.stringify(value)
  return new TextEncoder().encode(json).byteLength
}

function isHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:'
  }
  catch {
    return false
  }
}

export const useTackletStore = defineStore('tacklet', () => {
  const boardStore = useBoardStore()
  const widgetFactory = useWidgetFactory()

  function addTacklet(manifest: TackletManifestV1, pos?: { x: number; y: number }): Tacklet {
    const width = Math.max(160, Math.min(1600, manifest.dimensions?.defaultWidth ?? 320))
    const height = Math.max(120, Math.min(1200, manifest.dimensions?.defaultHeight ?? 240))
    const item = widgetFactory.createTacklet(manifest.id, manifest.url, {
      width,
      height,
      data: {},
      displayName: manifest.name,
    })
    if (pos) {
      boardStore.updateItem(item.id, {
        x_position: pos.x - width / 2,
        y_position: pos.y - height / 2,
      } as Partial<Tacklet>)
    }
    return item
  }

  function updateTackletData(itemId: string, data: unknown): { ok: true } | { ok: false; reason: string } {
    if (!isPlainObject(data)) return { ok: false, reason: 'Widget data must be an object' }

    let cloned: Record<string, unknown>
    try {
      cloned = JSON.parse(JSON.stringify(data)) as Record<string, unknown>
    }
    catch {
      return { ok: false, reason: 'Widget data must be JSON-serializable' }
    }

    let size = 0
    try {
      size = safeJsonSize(cloned)
    }
    catch {
      return { ok: false, reason: 'Widget data size check failed' }
    }
    if (size > MAX_WIDGET_DATA_BYTES) {
      return { ok: false, reason: `Widget data exceeds ${MAX_WIDGET_DATA_BYTES} bytes` }
    }

    const item = boardStore.items.get(itemId)
    if (!item || item.kind !== 'tacklet') return { ok: false, reason: 'Widget not found' }
    boardStore.updateItem(itemId, {
      content: { ...item.content, data: cloned },
    } as Partial<Tacklet>)
    return { ok: true }
  }

  function validateManifestV1(input: unknown): { ok: true; value: TackletManifestV1 } | { ok: false; reason: string } {
    if (!isPlainObject(input)) return { ok: false, reason: 'Manifest must be an object' }
    const id = input.id
    const name = input.name
    const url = input.url
    if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) return { ok: false, reason: 'Invalid manifest id' }
    if (typeof name !== 'string' || name.length < 3 || name.length > 50) return { ok: false, reason: 'Invalid manifest name' }
    if (typeof url !== 'string' || !isHttpsUrl(url)) return { ok: false, reason: 'Invalid manifest url' }
    return { ok: true, value: input as TackletManifestV1 }
  }

  return {
    addTacklet,
    updateTackletData,
    validateManifestV1,
    MAX_WIDGET_DATA_BYTES,
  }
})
