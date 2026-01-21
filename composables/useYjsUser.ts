// composables/useYjsUser.ts
import { useYjsConnection } from './useYjsConnection'
import { useBoardStore } from '@/stores/board'
import { ref, toRaw, onUnmounted, nextTick } from 'vue'

export function useYjsUser(boardId: string) {
  const { provider } = useYjsConnection(boardId)
  const awareness = provider.awareness
  const boardStore = useBoardStore()

  // 1) Set local user + role once
  const { currentUser } = useUser()
  const currentUserAccess = boardStore.accessList.find(
    (u) => u.profileId === boardStore.currentUserProfileId,
  )
  const role = currentUserAccess?.role ?? 'viewer'

  // Convert reactive user to plain object safely
  const plainUser = toRaw(currentUser.value)
  if (plainUser) {
    awareness.setLocalStateField('user', { ...plainUser, access: role })
  }

  // 2) Reactive list of online users
  const activeUsers = ref<User[]>([])

  function extractUserData(state: any): User | null {
    if (!state.user) return null

    // Handle different possible structures
    let userData = state.user

    // If it's a Vue ref, extract the value
    if (userData && typeof userData === 'object') {
      if ('value' in userData) userData = userData.value
      if ('_value' in userData) userData = userData._value
      if ('_rawValue' in userData) userData = userData._rawValue
    }

    // Validate the user data structure
    if (userData && typeof userData === 'object' && userData.id && userData.name) {
      return userData as User
    }

    return null
  }

  function updateActiveUsers() {
    try {
      const users: User[] = []
      awareness.getStates().forEach((state, clientId) => {
        const userData = extractUserData(state)
        if (userData) {
          users.push(userData)
        }
      })
      activeUsers.value = users
      console.log('Active users updated:', users.length)
    } catch (error) {
      console.error('Error updating active users:', error)
    }
  }

  // 3) Set up awareness listener
  awareness.on('change', updateActiveUsers)

  // 4) Initial update after next tick
  nextTick(() => {
    updateActiveUsers()
  })

  // 5) Cleanup on unmount
  onUnmounted(() => {
    awareness.off('change', updateActiveUsers)
  })

  return { activeUsers }
}
