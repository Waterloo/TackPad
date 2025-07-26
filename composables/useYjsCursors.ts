// composables/useYjsCursors.ts
import { useYjsConnection } from './useYjsConnection'
import { ref, onUnmounted, nextTick } from 'vue'

interface CursorPosition {
  x: number
  y: number
  timestamp: number
}

interface UserCursor {
  clientId: number
  user: User
  cursor: CursorPosition
}

export function useYjsCursors(boardId: string) {
  const { provider } = useYjsConnection(boardId)
  const awareness = provider.awareness
  const { currentUser } = useUser()

  // Reactive list of other users' cursors
  const cursors = ref<UserCursor[]>([])

  function extractUserData(state: any): User | null {
    if (!state.user) return null

    let userData = state.user
    if (userData && typeof userData === 'object') {
      if ('value' in userData) userData = userData.value
      if ('_value' in userData) userData = userData._value
      if ('_rawValue' in userData) userData = userData._rawValue
    }

    if (userData && typeof userData === 'object' && userData.id && userData.name) {
      return userData as User
    }
    return null
  }

  function updateCursors() {
    try {
      const currentCursors: UserCursor[] = []
      const currentUserId = currentUser.value?.id

      awareness.getStates().forEach((state, clientId) => {
        // Skip current user's cursor
        const userData = extractUserData(state)
        if (!userData || userData.id === currentUserId) return

        // Check if cursor data exists and is recent (within last 10 seconds)
        if (state.cursor && typeof state.cursor === 'object') {
          const now = Date.now()
          const cursorAge = now - (state.cursor.timestamp || 0)

          if (cursorAge < 10000) { // 10 seconds
            currentCursors.push({
              clientId,
              user: userData,
              cursor: state.cursor as CursorPosition
            })
          }
        }
      })

      cursors.value = currentCursors
    } catch (error) {
      console.error('Error updating cursors:', error)
    }
  }

  // Update local cursor position
  function updateCursorPosition(x: number, y: number) {
    try {
      awareness.setLocalStateField('cursor', {
        x,
        y,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error updating cursor position:', error)
    }
  }

  // Clear local cursor (when user stops moving mouse)
  function clearCursor() {
    try {
      awareness.setLocalStateField('cursor', null)
    } catch (error) {
      console.error('Error clearing cursor:', error)
    }
  }

  // Set up awareness listener
  awareness.on('change', updateCursors)

  // Initial update
  nextTick(() => {
    updateCursors()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    awareness.off('change', updateCursors)
    clearCursor()
  })

  return {
    cursors,
    updateCursorPosition,
    clearCursor
  }
}
