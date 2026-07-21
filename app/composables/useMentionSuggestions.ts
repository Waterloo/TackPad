import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import type { MentionData } from '~/shared/types/mention'

interface MemberEntry {
  id: string
  username: string | null
  firstName: string | null
}

interface BoardEntry {
  boardId: string
  title: string
}

interface SuggestionSection {
  label: string
  items: MentionData[]
}

export function useMentionSuggestions(boardId: Ref<string>) {
  const boardStore = useBoardStore()
  const authStore = useAuthStore()

  // Cached data
  const members = ref<MemberEntry[]>([])
  const boards = ref<BoardEntry[]>([])
  const membersLoaded = ref(false)
  const boardsLoaded = ref(false)

  async function loadMembers() {
    if (membersLoaded.value) return
    try {
      const data = await $fetch<MemberEntry[]>(`/api/board/${boardId.value}/members`)
      members.value = data
      membersLoaded.value = true
    }
    catch { /* silent */ }
  }

  async function loadBoards() {
    if (boardsLoaded.value) return
    try {
      const data = await $fetch<BoardEntry[]>('/api/board/list')
      boards.value = data
      boardsLoaded.value = true
    }
    catch { /* silent */ }
  }

  async function loadAll() {
    await Promise.all([loadMembers(), loadBoards()])
  }

  function filteredResults(query: string): SuggestionSection[] {
    const q = query.toLowerCase()
    const sections: SuggestionSection[] = []

    // People — only show if current user has a username
    if (authStore.profile?.username) {
      const people = members.value
        .filter(m => m.username && (
          m.username.toLowerCase().includes(q) ||
          (m.firstName?.toLowerCase().includes(q))
        ))
        .slice(0, 6)
        .map((m): MentionData => ({
          type: 'user',
          id: m.id,
          label: m.username!,
        }))
      if (people.length) sections.push({ label: 'People', items: people })
    }
    else {
      // Show a prompt to set username
      sections.push({
        label: 'People',
        items: [{ type: 'user' as const, id: '__set_username__', label: 'Set a username to mention people' }],
      })
    }

    // Board items
    const itemEntries = Array.from(boardStore.items.entries())
    const items = itemEntries
      .filter(([, item]) => {
        if (item.kind === 'group') return false
        const name = item.displayName || ''
        return name.toLowerCase().includes(q)
      })
      .slice(0, 6)
      .map(([id, item]): MentionData => ({
        type: 'item',
        id,
        label: item.displayName || `${item.kind} item`,
      }))
    if (items.length) sections.push({ label: 'Board Items', items })

    // Boards
    const boardResults = boards.value
      .filter(b => b.title.toLowerCase().includes(q))
      .slice(0, 4)
      .map((b): MentionData => ({
        type: 'board',
        id: b.boardId,
        label: b.title,
      }))
    if (boardResults.length) sections.push({ label: 'Boards', items: boardResults })

    return sections
  }

  return {
    members,
    boards,
    loadAll,
    loadMembers,
    loadBoards,
    filteredResults,
  }
}
