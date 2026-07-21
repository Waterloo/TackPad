<script setup lang="ts">
import { useNotificationsStore } from '~/stores/notifications'
import type { Notification } from '~/shared/types/notification'

const notifStore = useNotificationsStore()
const { unreadCount, notifications, isLoaded } = storeToRefs(notifStore)

const open = ref(false)
const bellRef = ref<HTMLButtonElement | null>(null)

function toggle() {
  open.value = !open.value
  if (open.value) {
    notifStore.fetchNotifications()
  }
}

function close() { open.value = false }

function handleClick(notif: Notification) {
  if (!notif.read) notifStore.markAsRead(notif.id)
  close()
  if (notif.data.boardId) {
    const hash = notif.data.itemId ? `#item=${notif.data.itemId}` : ''
    navigateTo(`/board/${notif.data.boardId}${hash}`)
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// Close on outside click
function onDocClick(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as HTMLElement
  if (bellRef.value?.contains(target)) return
  const dropdown = document.querySelector('.nb-dropdown')
  if (dropdown?.contains(target)) return
  close()
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div class="nb-wrap">
    <button ref="bellRef" class="nb-btn" :class="{ 'nb-btn--active': open }" title="Notifications" @click.stop="toggle">
      <!-- Bell icon -->
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <!-- Badge -->
      <span v-if="unreadCount > 0" class="nb-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>

    <!-- Dropdown -->
    <Teleport to="body">
      <Transition name="nb-pop">
        <div v-if="open" class="nb-dropdown" @click.stop>
          <div class="nb-header">
            <span class="nb-header-title">Notifications</span>
          </div>

          <div v-if="!notifications.length" class="nb-empty">
            No notifications yet
          </div>

          <div v-else class="nb-list">
            <button
              v-for="notif in notifications"
              :key="notif.id"
              class="nb-row"
              :class="{ 'nb-row--unread': !notif.read }"
              @click="handleClick(notif)"
            >
              <!-- Avatar circle -->
              <div class="nb-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              <div class="nb-content">
                <p class="nb-text">
                  <strong>@{{ notif.data.mentionedByUsername }}</strong>
                  {{ notif.data.isComment ? 'commented on' : 'mentioned you in' }}
                  <strong>{{ notif.data.itemDisplayName || 'an item' }}</strong>
                </p>
                <span class="nb-time">{{ relativeTime(notif.createdAt) }}</span>
              </div>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.nb-wrap { position: relative; display: flex; align-items: center; }

.nb-btn {
  position: relative;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent;
  border-radius: 8px; color: #9CA3AF;
  cursor: pointer; transition: background 0.1s, color 0.1s;
}
.nb-btn:hover, .nb-btn--active { background: #F3F4F6; color: #374151; }

.nb-badge {
  position: absolute;
  top: 2px; right: 2px;
  min-width: 16px; height: 16px;
  padding: 0 4px;
  border-radius: 9999px;
  background: #EF4444;
  color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 9px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  line-height: 1;
  border: 2px solid #fff;
}

.nb-dropdown {
  position: fixed;
  top: 52px; right: 12px;
  width: 360px;
  max-height: 420px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nb-header {
  padding: 12px 16px;
  border-bottom: 1px solid #F3F4F6;
  flex-shrink: 0;
}

.nb-header-title {
  font-family: system-ui, sans-serif;
  font-size: 13px;
  font-weight: 650;
  color: #111827;
}

.nb-empty {
  padding: 32px 16px;
  text-align: center;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  color: #9CA3AF;
}

.nb-list {
  overflow-y: auto;
  flex: 1;
}

.nb-list::-webkit-scrollbar { width: 4px; }
.nb-list::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 2px; }

.nb-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.08s;
  border-left: 3px solid transparent;
}

.nb-row:hover { background: #F9FAFB; }
.nb-row--unread { border-left-color: #3B82F6; background: #F7F9FF; }

.nb-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: #3B82F6;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.nb-content { flex: 1; min-width: 0; }

.nb-text {
  font-family: system-ui, sans-serif;
  font-size: 12.5px;
  color: #374151;
  margin: 0;
  line-height: 1.4;
}
.nb-text strong { font-weight: 600; color: #111827; }

.nb-time {
  font-family: system-ui, sans-serif;
  font-size: 11px;
  color: #9CA3AF;
}

/* Transitions */
.nb-pop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.nb-pop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.nb-pop-enter-from { opacity: 0; transform: translateY(-4px) scale(0.97); }
.nb-pop-leave-to { opacity: 0; transform: translateY(-2px); }
</style>
