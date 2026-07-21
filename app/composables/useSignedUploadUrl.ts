import { useBoardStore } from '~/stores/board'

interface SignedUrlResponse {
  url: string
  expiresAt: number
}

interface CacheEntry {
  url: string
  expiresAt: number
}

const signedUrlCache = new Map<string, CacheEntry>()
const signedUrlInFlight = new Map<string, Promise<SignedUrlResponse>>()

export function useSignedUploadUrl(
  uploadId: Ref<string | null | undefined>,
  fallbackUrl: Ref<string | undefined>,
) {
  const boardStore = useBoardStore()
  const signedUrl = ref<string>('')
  const expiresAt = ref<number>(0)
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  function clearTimer() {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }

  function scheduleRefresh() {
    clearTimer()
    if (!expiresAt.value) return
    const msUntilRefresh = Math.max(5000, expiresAt.value - Date.now() - 60_000)
    refreshTimer = setTimeout(() => { void refresh(true) }, msUntilRefresh)
  }

  async function refresh(force = false) {
    const id = uploadId.value
    const boardId = boardStore.boardId || ''
    if (!id) {
      signedUrl.value = fallbackUrl.value || ''
      expiresAt.value = 0
      clearTimer()
      return
    }
    const key = `${id}:${boardId}`

    const cached = signedUrlCache.get(key)
    if (!force && cached && cached.expiresAt - Date.now() > 60_000) {
      signedUrl.value = cached.url
      expiresAt.value = cached.expiresAt
      scheduleRefresh()
      return
    }

    try {
      let request = signedUrlInFlight.get(key)
      if (!request) {
        request = $fetch<SignedUrlResponse>(`/api/upload/${id}/url`, {
          params: { boardId: boardId || undefined },
        }).finally(() => {
          signedUrlInFlight.delete(key)
        })
        signedUrlInFlight.set(key, request)
      }

      const data = await request
      signedUrl.value = data.url
      expiresAt.value = data.expiresAt
      signedUrlCache.set(key, { url: data.url, expiresAt: data.expiresAt })
      scheduleRefresh()
    }
    catch {
      signedUrl.value = fallbackUrl.value || ''
      expiresAt.value = 0
      clearTimer()
    }
  }

  watch([uploadId, () => boardStore.boardId], () => {
    void refresh(false)
  }, { immediate: true })

  onUnmounted(() => {
    clearTimer()
  })

  return {
    signedUrl,
    refreshSignedUrl: refresh,
  }
}
