<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import { useYjsPresence } from '~/composables/yjs/useYjsPresence'
import BoardsPopover from './BoardsPopover.vue'
import NotificationBell from './NotificationBell.vue'
const emit = defineEmits<{ share: []; profile: [] }>()

const boardStore = useBoardStore()
const authStore  = useAuthStore()

const { title, boardType, connectionStatus, isSaving, wsProvider, boardId } = storeToRefs(boardStore)
const { profile } = storeToRefs(authStore)

const presenceProfile = computed(() => {
  const p = profile.value
  if (!p) return null
  return { id: p.id, name: p.firstName || p.username || 'Anonymous', role: 'editor' as const }
})

const { activeUsers } = useYjsPresence(wsProvider, presenceProfile)

// ── Title editing ─────────────────────────────────────────────────────────────
const isEditing = ref(false)
const editValue = ref('')
const inputRef  = ref<HTMLInputElement | null>(null)

function startEdit() {
  editValue.value = title.value
  isEditing.value = true
  nextTick(() => inputRef.value?.select())
}
function commitEdit() {
  boardStore.updateTitle(editValue.value.trim() || 'Untitled Board')
  isEditing.value = false
}
function cancelEdit() { isEditing.value = false }
function onTitleKey(e: KeyboardEvent) {
  if (e.key === 'Enter')  { e.preventDefault(); commitEdit() }
  if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
}

// ── Board popover ─────────────────────────────────────────────────────────────
const popoverOpen = ref(false)

function togglePopover() { popoverOpen.value = !popoverOpen.value }
function closePopover()  { popoverOpen.value = false }

function onPopoverNavigate(id: string) {
  closePopover()
  navigateTo(`/board/${id}`)
}


// ── Presence ─────────────────────────────────────────────────────────────────
const MAX_AVATARS   = 4
const visibleUsers  = computed(() => activeUsers.value.slice(0, MAX_AVATARS))
const overflowCount = computed(() => Math.max(0, activeUsers.value.length - MAX_AVATARS))

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '').join('')
}

// ── Connection ────────────────────────────────────────────────────────────────
const DOT_COLORS: Record<string, string> = {
  connected: '#22C55E', connecting: '#F59E0B',
  disconnected: '#D1D5DB', error: '#EF4444',
}
const statusColor = computed(() => DOT_COLORS[connectionStatus.value] ?? '#D1D5DB')
</script>

<template>
  <header class="hdr">

    <!-- ── Left: board switcher ────────────────────────────────────────────── -->
    <div class="hdr-left">
      <div class="ddwrap" @click.stop>
        <button
          class="icon-btn"
          :class="{ 'icon-btn--on': popoverOpen }"
          aria-label="Your boards"
          title="Your boards"
          @click="togglePopover"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="0" y="0" width="6" height="6" rx="1.3"/>
            <rect x="8" y="0" width="6" height="6" rx="1.3"/>
            <rect x="0" y="8" width="6" height="6" rx="1.3"/>
            <rect x="8" y="8" width="6" height="6" rx="1.3"/>
          </svg>
        </button>

        <BoardsPopover
          :current-board-id="boardId"
          :open="popoverOpen"
          @close="closePopover"
          @navigate="onPopoverNavigate"
        />
      </div>
    </div>

    <!-- ── Center: editable title nameplate ───────────────────────────────── -->
    <div class="hdr-center">
      <Transition name="t-swap" mode="out-in">
        <button v-if="!isEditing" key="display" class="title-plate" @click="startEdit">
          <span class="title-serif">{{ title || 'Untitled Board' }}</span>
          <span class="title-pencil" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
          </span>
        </button>

        <input
          v-else
          key="edit"
          ref="inputRef"
          v-model="editValue"
          class="title-input"
          placeholder="Untitled Board"
          spellcheck="false"
          @blur="commitEdit"
          @keydown="onTitleKey"
          @click.stop
        />
      </Transition>
    </div>

    <!-- ── Right: share · presence · save · conn ──────────────────────────── -->
    <div class="hdr-right">

      <!-- Profile avatar button -->
      <button
        v-if="profile"
        class="profile-avatar-btn"
        aria-label="Account"
        title="Account"
        @click="emit('profile')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      <span class="vsep" />

      <!-- Notification bell -->
      <NotificationBell />

      <span v-if="boardType !== 'vault'" class="vsep" />

      <!-- Share pill -->
      <button
        v-if="boardType !== 'vault'"
        class="share-btn"
        title="Share board"
        aria-label="Share board"
        @click="emit('share')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        Share
      </button>

      <span v-if="activeUsers.length" class="vsep" />

      <!-- Presence avatars -->
      <TransitionGroup v-if="activeUsers.length" name="av" tag="div" class="avatars">
        <div
          v-for="(user, i) in visibleUsers"
          :key="user.id"
          class="av"
          :style="{ '--c': user.color, zIndex: MAX_AVATARS - i }"
          :title="user.name"
        >{{ initials(user.name) }}</div>
        <div
          v-if="overflowCount > 0"
          key="__more"
          class="av av--more"
          :title="`${overflowCount} more`"
        >+{{ overflowCount }}</div>
      </TransitionGroup>

      <span class="vsep" />

      <!-- Save arc-spinner -->
      <Transition name="fade">
        <span v-if="isSaving" class="save-spin" title="Saving…">
          <svg width="13" height="13" viewBox="0 0 13 13" class="spin-svg">
            <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="#D1D5DB" stroke-width="1.6"/>
            <path d="M6.5 1.5 A5 5 0 0 1 11.5 6.5" fill="none" stroke="#6B7280" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </span>
      </Transition>

      <!-- Connection dot -->
      <span
        class="conn-dot"
        :class="{ 'conn-dot--pulse': connectionStatus === 'connecting' }"
        :style="{ background: statusColor }"
        :title="connectionStatus"
        role="status"
      />

    </div>
  </header>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap');

/* ── Shell ───────────────────────────────────────────────────────────────── */
.hdr {
  --accent: #2563EB;
  --ring:   rgba(37, 99, 235, 0.12);
  --ink:    #0C0C0C;

  position: fixed;
  inset: 0 0 auto 0;
  height: 48px;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
  box-shadow: 0 1px 0 rgba(0,0,0,0.03), 0 2px 12px rgba(0,0,0,0.04);

  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 10px;
}

.hdr-left  { display: flex; align-items: center; }
.hdr-center{ display: flex; justify-content: center; align-items: center; min-width: 0; }
.hdr-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }

/* ── Icon button (grid) ──────────────────────────────────────────────────── */
.icon-btn {
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent;
  border-radius: 8px; color: #BBBFC6; cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.icon-btn:hover, .icon-btn--on { background: #F4F4F4; color: #374151; }
.icon-btn:active                { background: #EBEBEB; }

/* ── Board popover wrapper ───────────────────────────────────────────────── */
.ddwrap { position: relative; }

/* ── Title nameplate ─────────────────────────────────────────────────────── */
.title-plate {
  display: inline-flex; align-items: center; gap: 7px;
  border: 1px solid transparent; border-radius: 8px;
  background: transparent; padding: 5px 10px;
  cursor: text; max-width: 420px;
  transition: background 0.12s, border-color 0.12s;
}
.title-plate:hover {
  background: #FAFAFA;
  border-color: rgba(0,0,0,0.07);
}
.title-plate:hover .title-pencil { opacity: 1; transform: translateX(0) scale(1); }

.title-serif {
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic; font-size: 15.5px; font-weight: 400;
  color: var(--ink); letter-spacing: 0.015em; line-height: 1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 360px;
}

.title-pencil {
  color: #C0C4CC; opacity: 0;
  transform: translateX(-5px) scale(0.9);
  flex-shrink: 0; display: flex;
  transition: opacity 0.13s, transform 0.13s;
}

/* ── Title input ─────────────────────────────────────────────────────────── */
.title-input {
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic; font-size: 15.5px; font-weight: 400;
  color: var(--ink); letter-spacing: 0.015em; line-height: 1.2;
  background: #FAFAFA;
  border: 1px solid #E2E5E9; border-radius: 8px;
  padding: 5px 10px; outline: none; width: 280px;
  transition: border-color 0.13s, box-shadow 0.13s, background 0.13s;
}
.title-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--ring);
  background: #fff;
}
.title-input::placeholder { color: #C8CAD0; font-style: italic; }

.t-swap-enter-active { transition: opacity 0.1s ease; }
.t-swap-leave-active { transition: opacity 0.07s ease; }
.t-swap-enter-from, .t-swap-leave-to { opacity: 0; }

/* ── Share button ────────────────────────────────────────────────────────── */
.share-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 0 11px;
  border: 1px solid rgba(0,0,0,0.10); border-radius: 9999px;
  background: #fff; font-family: system-ui, sans-serif;
  font-size: 12px; font-weight: 500; color: #374151;
  cursor: pointer; white-space: nowrap;
  transition: background 0.1s, border-color 0.1s, color 0.1s, transform 0.12s;
}
.share-btn:hover  { background: #F9FAFB; border-color: rgba(0,0,0,0.16); color: #111827; transform: scale(1.02); }
.share-btn:active { transform: scale(0.98); }

/* ── Presence avatars ────────────────────────────────────────────────────── */
.avatars { display: flex; align-items: center; }

.av {
  width: 26px; height: 26px; border-radius: 50%;
  border: 2px solid #fff; background: var(--c, #9CA3AF);
  color: #fff; font-family: system-ui, sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: 0.03em;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; position: relative;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.07);
  cursor: default;
  transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
}
.av + .av { margin-left: -8px; }
.av:hover  { transform: translateY(-3px) scale(1.12); z-index: 20 !important; }

.av--more  { background: #EDEDED !important; color: #6B7280; font-size: 8px; letter-spacing: 0; }

.av-enter-active { transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease; }
.av-leave-active { transition: transform 0.14s ease, opacity 0.14s ease; }
.av-enter-from   { transform: scale(0.4) translateY(4px); opacity: 0; }
.av-leave-to     { transform: scale(0.4); opacity: 0; }

/* ── Separator ───────────────────────────────────────────────────────────── */
.vsep { width: 1px; height: 18px; background: #E9EAEC; flex-shrink: 0; }

/* ── Save spinner ────────────────────────────────────────────────────────── */
.save-spin { display: flex; align-items: center; }
.spin-svg  { animation: arc-rot 0.7s linear infinite; }
@keyframes arc-rot { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

/* ── Connection dot ──────────────────────────────────────────────────────── */
.conn-dot {
  width: 8px; height: 8px; border-radius: 50%;
  flex-shrink: 0; transition: background 0.35s ease;
}
.conn-dot--pulse { animation: dot-pulse 1.4s ease-in-out infinite; }
@keyframes dot-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }

/* ── Profile avatar button ──────────────────────────────────────────────── */
.profile-avatar-btn {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid #E5E7EB; border-radius: 50%;
  background: #F9FAFB; color: #6B7280; cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.profile-avatar-btn:hover,
.profile-avatar-btn:active { background: #EFF6FF; border-color: #93C5FD; color: #2563EB; }

/* ── Mobile responsive ────────────────────────────────────────────── */
@media (max-width: 640px) {
  .hdr {
    padding: 0 8px;
    padding-left: calc(8px + env(safe-area-inset-left, 0px));
    padding-right: calc(8px + env(safe-area-inset-right, 0px));
  }

  .hdr-right { gap: 5px; }

  .share-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    justify-content: center;
    font-size: 0; /* hides "Share" text */
    gap: 0;
    min-width: 28px;
  }
  .share-btn svg { font-size: initial; }

  .title-plate { max-width: 160px; }
  .title-serif { max-width: 140px; font-size: 14px; }
  .title-input { width: 160px; font-size: 14px; }

  .vsep { display: none; }

  .av { width: 22px; height: 22px; font-size: 8px; }
  .av + .av { margin-left: -6px; }
}

@media (pointer: coarse) {
  .icon-btn { width: 40px; height: 40px; }
  .share-btn { min-height: 36px; }
  .profile-avatar-btn { width: 36px; height: 36px; }
}
</style>
