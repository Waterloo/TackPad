import { useBoardStore } from '~/stores/board'
import type { Comment } from '~/shared/types/checkpoint'

const countCache = new Map<string, { count: number; fetchedAt: number }>()
const STALE_MS = 30_000 // re-fetch after 30s

export function useCommentCount(itemId: Ref<string>) {
  const boardStore = useBoardStore()
  const count = ref(0)

  async function fetchCount() {
    if (!boardStore.boardId) return
    const key = `${boardStore.boardId}:${itemId.value}`
    const cached = countCache.get(key)
    if (cached && Date.now() - cached.fetchedAt < STALE_MS) {
      count.value = cached.count
      return
    }
    try {
      const comments = await $fetch<Comment[]>(`/api/board/${boardStore.boardId}/comments`, {
        query: { itemId: itemId.value },
      })
      count.value = comments.length
      countCache.set(key, { count: comments.length, fetchedAt: Date.now() })
    }
    catch { /* silent */ }
  }

  function setCount(n: number) {
    count.value = n
    const key = `${boardStore.boardId}:${itemId.value}`
    countCache.set(key, { count: n, fetchedAt: Date.now() })
  }

  return { count, fetchCount, setCount }
}
