import { defineStore } from 'pinia'
import type { Notification } from '~/shared/types/notification'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const isLoaded = ref(false)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function fetchUnreadCount() {
    try {
      const { count } = await $fetch<{ count: number }>('/api/notifications/unread-count')
      unreadCount.value = count
    }
    catch { /* silent */ }
  }

  async function fetchNotifications(limit = 20, offset = 0) {
    try {
      const data = await $fetch<Notification[]>('/api/notifications', {
        params: { limit, offset },
      })
      if (offset === 0) {
        notifications.value = data
      }
      else {
        notifications.value = [...notifications.value, ...data]
      }
      isLoaded.value = true
    }
    catch { /* silent */ }
  }

  async function markAsRead(id: string) {
    try {
      await $fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      const notif = notifications.value.find(n => n.id === id)
      if (notif && !notif.read) {
        notif.read = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    }
    catch { /* silent */ }
  }

  function startPolling() {
    fetchUnreadCount()
    if (pollTimer) return
    pollTimer = setInterval(fetchUnreadCount, 60_000)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  return {
    notifications,
    unreadCount,
    isLoaded,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    startPolling,
    stopPolling,
  }
})
