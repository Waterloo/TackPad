import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'

export interface ReactionEntry {
  emoji: string
  count: number
  voted: boolean  // true if the current user has voted for this emoji
}

/**
 * Manages emoji reactions for a single board item.
 *
 * Data model: item.reactions = { [emoji]: profileId[] }
 *   - Count  = array length
 *   - "Mine" = array includes my profileId
 *   - Toggle = add if absent, remove if present
 *
 * Writes go through boardStore.updateReactions() which bypasses the
 * lastUpdatedAt stamp — a reaction vote is not a content edit.
 *
 * Note: concurrent reaction updates from multiple collaborators use
 * Yjs last-write-wins semantics (items are stored as plain objects,
 * not nested Y.Map). For the current scale this is acceptable.
 */
export function useReactions(itemId: string) {
  const boardStore = useBoardStore()
  const authStore = useAuthStore()

  const profileId = computed(() => authStore.profile?.id ?? null)

  /** Raw reactions map from the item, defaulting to empty object. */
  const raw = computed(() => boardStore.items.get(itemId)?.reactions ?? {})

  /** Sorted list of reactions with counts and "did I vote?" flag. */
  const reactionList = computed<ReactionEntry[]>(() =>
    Object.entries(raw.value)
      .filter(([, voters]) => voters.length > 0)
      .map(([emoji, voters]) => ({
        emoji,
        count: voters.length,
        voted: !!profileId.value && voters.includes(profileId.value),
      }))
      .sort((a, b) => b.count - a.count),
  )

  /** True if any reaction has at least one vote. */
  const hasReactions = computed(() => reactionList.value.length > 0)

  /**
   * Toggle the current user's vote on an emoji.
   * Add if not voted; remove if already voted.
   * If removing empties the emoji bucket, that emoji key is deleted.
   */
  function toggle(emoji: string) {
    if (!profileId.value) return
    const item = boardStore.items.get(itemId)
    if (!item) return

    // Deep-copy to avoid mutating reactive proxy
    const next: Record<string, string[]> = {}
    for (const [e, voters] of Object.entries(raw.value)) {
      next[e] = [...voters]
    }

    const bucket = next[emoji] ?? []
    const idx = bucket.indexOf(profileId.value)

    if (idx >= 0) {
      bucket.splice(idx, 1)
      if (bucket.length === 0) delete next[emoji]
      else next[emoji] = bucket
    }
    else {
      next[emoji] = [...bucket, profileId.value]
    }

    boardStore.updateReactions(itemId, next)
  }

  return { reactionList, hasReactions, toggle }
}
