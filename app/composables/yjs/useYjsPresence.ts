import type { WebsocketProvider } from 'y-websocket'
import type { ActiveUser } from '~/shared/types/board'

/**
 * Deterministic color from a profile ID — stable across reloads.
 */
function profileColor(id: string): string {
  const palette = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  ]
  let h = 5381
  for (const c of id) h = ((h << 5) + h) ^ c.charCodeAt(0)
  return palette[Math.abs(h) % palette.length]!
}

/**
 * Manages Yjs Awareness for local user presence.
 *
 * Call from a component's setup() — uses onUnmounted to clean up.
 *
 * @param wsProvider - reactive ref from boardStore.wsProvider
 * @param profile    - reactive ref with { id, name, role? }
 */
export function useYjsPresence(
  wsProviderRef: Ref<WebsocketProvider | null>,
  profileRef: Ref<{ id: string; name: string; role?: string } | null>,
) {
  const activeUsers = ref<ActiveUser[]>([])
  let _cleanup: (() => void) | null = null

  function attach(wp: WebsocketProvider, p: { id: string; name: string; role?: string }) {
    const awareness = wp.awareness
    const color = profileColor(p.id)

    const localUser: ActiveUser = {
      id: p.id,
      name: p.name || 'Anonymous',
      color,
      role: p.role ?? 'editor',
    }

    awareness.setLocalStateField('user', localUser)

    function sync() {
      const users: ActiveUser[] = []
      awareness.getStates().forEach((state) => {
        if (state.user) users.push(state.user as ActiveUser)
      })
      activeUsers.value = users
    }

    awareness.on('change', sync)
    sync()

    _cleanup = () => {
      awareness.off('change', sync)
      // Clear local presence so remote peers remove our avatar immediately
      try { awareness.setLocalState(null) } catch { /* provider may already be gone */ }
      activeUsers.value = []
    }
  }

  watch(
    [wsProviderRef, profileRef] as const,
    ([wp, p]) => {
      _cleanup?.()
      _cleanup = null
      if (wp && p) attach(wp, p)
    },
    { immediate: true },
  )

  onUnmounted(() => {
    _cleanup?.()
    _cleanup = null
  })

  return { activeUsers }
}
