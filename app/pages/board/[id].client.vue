<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'
import { useNotificationsStore } from '~/stores/notifications'
import { useWidgetFactory } from '~/composables/widgets/useWidgetFactory'
import BoardSharePopup from '~/components/profile/BoardSharePopup.vue'
import ProfilePanel from '~/components/profile/ProfilePanel.vue'
import UploadPopover from '~/components/ui/UploadPopover.vue'
import VoiceRecorder from '~/components/ui/VoiceRecorder.vue'
import WidgetWrapper from '~/components/widgets/WidgetWrapper.vue'
import GroupWidget         from '~/components/widgets/GroupWidget.vue'
import MultiSelectToolbar from '~/components/board/MultiSelectToolbar.vue'
import BoardSelectOverlay from '~/components/board/BoardSelectOverlay.vue'
import StickyNote  from '~/components/widgets/StickyNote.vue'
import TodoList    from '~/components/widgets/TodoList.vue'
import LinkItem    from '~/components/widgets/LinkItem.vue'
import Timer       from '~/components/widgets/Timer.vue'
import TextWidget  from '~/components/widgets/TextWidget.vue'
import SecretNote from '~/components/widgets/SecretNote.vue'
import SecretKeyValue from '~/components/widgets/SecretKeyValue.vue'
import ImageWidget from '~/components/widgets/ImageWidget.vue'
import AudioWidget from '~/components/widgets/AudioWidget.vue'
import FileWidget  from '~/components/widgets/FileWidget.vue'
import Tacklet from '~/components/widgets/Tacklet.vue'
import TackletsDirectory from '~/components/widgets/TackletsDirectory.vue'
import { useTackletStore } from '~/stores/tacklet'
import type { TackletManifestV1 } from '~/shared/types/board'


definePageMeta({ layout: 'default', alias: '/' })

const route   = useRoute()
const boardId = computed(() => (route.params.id as string) || 'load')

const boardStore   = useBoardStore()
const authStore    = useAuthStore()
const uiStore      = useUiStore()
const notifStore   = useNotificationsStore()
const tackletStore = useTackletStore()
const toast = useToast()

const { boardItemsArray, isLoaded, isSwitching, loadError, boardId: activeBoardId } = storeToRefs(boardStore)
const { drawingMode, boardSelectMode, isFilePickerVisible, isVoiceRecorderVisible, isTackletsDirectoryVisible } = storeToRefs(uiStore)

// ── Browser title ─────────────────────────────────────────────────────────────
const { title } = storeToRefs(boardStore)
useHead({
  title: computed(() => title.value || 'Tackpad'),
})

/** true while the board is loading (initial or switching) */
const showLoading = computed(() => (!isLoaded.value || isSwitching.value) && !loadError.value)

// Separate group items from regular widget items for layered rendering
const groupItems = computed(() => boardItemsArray.value.filter(it => it.kind === 'group'))
const widgetItems = computed(() => boardItemsArray.value.filter(it => it.kind !== 'group'))

// ── Command palette ──────────────────────────────────────────────────────────
const { isCommandPaletteOpen } = storeToRefs(uiStore)
function openCommandPalette() { isCommandPaletteOpen.value = true }

// ── Phase 7 composables ──────────────────────────────────────────────────────
useGlobalShortcuts(openCommandPalette)
useClipboard()

// ── Share popup ──────────────────────────────────────────────────────────────
const shareOpen = ref(false)

// ── Profile panel ───────────────────────────────────────────────────────────
const profilePanelOpen = ref(false)

// ── Board init ───────────────────────────────────────────────────────────────
async function handleBoardRoute(id: string) {
  // Resolve special routes to a concrete board ID
  if (id === 'create' || id === 'load') {
    let targetId: string | null = null

    if (id === 'load') {
      const ids = Object.keys(boardStore.knownBoards)
      if (ids.length) targetId = ids[ids.length - 1]!
    }

    if (!targetId) {
      const { id: newId } = await $fetch<{ id: string }>('/api/board/create', { method: 'POST' })
      targetId = newId
    }

    // Update browser URL without triggering Vue Router navigation.
    // Using history.replaceState avoids a potential component remount
    // (alias '/' → '/board/:id' can change the NuxtPage key), which
    // would destroy the Yjs doc mid-initialization.
    window.history.replaceState({}, '', `/board/${targetId}`)
    id = targetId
  }

  // Initialize the resolved board
  if (boardStore.boardId && boardStore.boardId !== id) {
    await boardStore.switchBoard(id)
  } else if (!isLoaded.value) {
    await boardStore.initializeBoard(id)
  }
}

onMounted(async () => {
  if (!authStore.isLoaded) await authStore.fetchProfile()
  // Sync known boards with server access list (prunes revoked boards)
  boardStore.syncKnownBoards()
  await handleBoardRoute(boardId.value)
  // Handle #item=<id> hash for cross-board pan-on-load
  _handleItemHash()
  // Start notification polling
  notifStore.startPolling()
  // After OAuth login, prompt for username if missing
  if (!authStore.isAnonymous && !authStore.profile?.username) {
    profilePanelOpen.value = true
  }
})

function _handleItemHash() {
  const hash = window.location.hash
  const match = hash.match(/item=([^&]+)/)
  if (!match) return
  const itemId = match[1]
  // If already loaded, pan immediately
  if (isLoaded.value) {
    nextTick(() => {
      boardStore.panToItem(itemId)
      history.replaceState(null, '', window.location.pathname)
    })
    return
  }
  // Otherwise wait for load
  const stop = watch(isLoaded, (loaded) => {
    if (!loaded) return
    stop()
    nextTick(() => {
      boardStore.panToItem(itemId)
      history.replaceState(null, '', window.location.pathname)
    })
  })
}

// Watch for route param changes (same-tab board switching via popover).
// Skip if the board is already initialized for this ID — avoids a double-init
// when handleBoardRoute's fire-and-forget navigateTo updates the URL.
watch(boardId, async (newId) => {
  if (newId && newId !== 'create' && newId !== 'load' && newId !== boardStore.boardId) {
    await handleBoardRoute(newId)
  }
})

onUnmounted(() => {
  boardStore.destroyBoard() // also calls drawingStore.destroy()
  uiStore.exitDrawingMode()
  uiStore.exitBoardSelectMode()
  notifStore.stopPolling()
})

// Click on canvas background → place pending widget or deselect all
const factory = useWidgetFactory()
const runtimeConfig = useRuntimeConfig()
const tackletsEnabled = computed(() => runtimeConfig.public.tackletsV2Enabled !== false)

function onAddTacklet(manifest: TackletManifestV1) {
  if (!tackletsEnabled.value) return
  tackletStore.addTacklet(manifest)
  toast.add({
    severity: 'success',
    summary: 'Tacklet added',
    detail: manifest.name,
    life: 2200,
  })
}

async function onCanvasClick(e: MouseEvent) {
  if (uiStore.pendingTool) {
    if (uiStore.pendingTool === 'image') {
      const ok = await authStore.requireOAuth()
      if (!ok) {
        uiStore.clearPendingTool()
        toast.add({
          severity: 'info',
          summary: 'Login required',
          detail: 'Image uploads require OAuth login.',
          life: 2600,
        })
        return
      }
    }
    // Convert screen coords to board coords using store values
    const vw = window.innerWidth
    const vh = window.innerHeight
    const viewportTop = 48 // BoardCanvas top offset (header height)
    const s = boardStore.scale
    const pos = {
      x: (e.clientX - vw / 2 - boardStore.translateX) / s,
      y: (e.clientY - (vh / 2 + viewportTop) - boardStore.translateY) / s,
    }
    factory.createAtPosition(uiStore.pendingTool, pos)
    uiStore.clearPendingTool()
    return
  }
  if (!drawingMode.value && !boardSelectMode.value) uiStore.deselectAll()
}

// Map widget kind → component reference (string names don't resolve at runtime)
const WIDGET_COMPONENTS = {
  note:    StickyNote,
  todo:    TodoList,
  link:    LinkItem,
  timer:   Timer,
  text:    TextWidget,
  secret_note: SecretNote,
  secret_kv: SecretKeyValue,
  image:   ImageWidget,
  audio:   AudioWidget,
  file:    FileWidget,
  tacklet: Tacklet,
} as const
</script>

<template>
  <BoardHeader @share="shareOpen = true" @profile="profilePanelOpen = true" />

  <BoardSharePopup v-if="activeBoardId" v-model="shareOpen" :board-id="activeBoardId" />

  <ProfilePanel v-model:visible="profilePanelOpen" />
  <UploadPopover v-model:visible="isFilePickerVisible" />
  <VoiceRecorder v-model:visible="isVoiceRecorderVisible" />
  <TackletsDirectory
    v-if="tackletsEnabled"
    v-model="isTackletsDirectoryVisible"
    @add="onAddTacklet"
  />

  <BoardCommandPalette v-model="isCommandPaletteOpen" />

  <!-- Loading / error overlay — full viewport, above everything -->
  <Transition name="fade">
    <div v-if="showLoading || loadError" class="board-overlay">
      <!-- Loading spinner -->
      <template v-if="showLoading">
        <div class="board-loading-spinner" />
        <span class="board-overlay-text">Loading board...</span>
      </template>

      <!-- Error state -->
      <template v-else-if="loadError">
        <div class="error-card" :class="{ 'error-card--denied': loadError.status === 403 }">
          <!-- Lock / warning icon -->
          <div class="error-card-icon" :class="loadError.status === 403 ? 'error-card-icon--lock' : 'error-card-icon--warn'">
            <svg v-if="loadError.status === 403" width="32" height="32" viewBox="0 0 24 24" fill="none"
                 stroke="#DC2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none"
                 stroke="#D97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2 class="error-card-title">{{ loadError.status === 403 ? 'Access Denied' : 'Board Not Found' }}</h2>

          <p class="error-card-msg">{{ loadError.message }}</p>

          <p v-if="loadError.status === 403" class="error-card-hint">
            Ask the board owner for an invite link to get access.
          </p>

          <div class="error-card-id">{{ boardId }}</div>

          <button class="error-card-btn" @click="navigateTo('/')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Go to Tackpad
          </button>
        </div>
      </template>
    </div>
  </Transition>

  <BoardCanvas @click="onCanvasClick">
    <!-- Rubber-band selection overlay (board space, z-index 1, behind widgets) -->
    <BoardSelectOverlay />

    <!-- Multi-select floating toolbar (board space, above selection bbox) -->
    <MultiSelectToolbar />

    <!-- Group layer (z-index 5, behind regular widgets) -->
    <GroupWidget
      v-for="group in groupItems"
      :key="group.id"
      :item-id="group.id"
    />

    <!-- Widget layer -->
    <WidgetWrapper
      v-for="item in widgetItems"
      :key="item.id"
      :item-id="item.id"
    >
      <component
        :is="WIDGET_COMPONENTS[item.kind as keyof typeof WIDGET_COMPONENTS]"
        :item-id="item.id"
      />
    </WidgetWrapper>
  </BoardCanvas>

  <!-- Floating toolbar (hidden in drawing mode) -->
  <BoardToolbar v-if="!drawingMode" />

  <!-- Drawing toolbar (shown in drawing mode) -->
  <BoardDrawingToolbar v-if="drawingMode" />

  <!-- Pan toggle (mobile, above zoom controls) -->
  <BoardPanToggle />

  <!-- Zoom controls (bottom-right) -->
  <BoardZoomControls />

  <!-- MiniMap (above zoom controls) -->
  <BoardMiniMap />

  <!-- Offline indicator -->
  <BoardOfflineIndicator />

</template>

<style scoped>
.board-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #F9FAFB;
  z-index: 100;
}

.board-loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #E5E7EB;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ── Error card ─────────────────────────────────────────────────────────── */
.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 380px;
  max-width: 90vw;
  padding: 36px 32px 28px;
  border-radius: 18px;
  background: linear-gradient(165deg, #FFFDF7 0%, #FFF9EE 50%, #FFFCF5 100%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 8px 32px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.error-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}
.error-card-icon--lock { background: #FEF2F2; }
.error-card-icon--warn { background: #FFFBEB; }

.error-card-title {
  font-family: system-ui, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  letter-spacing: -0.01em;
}

.error-card-msg {
  font-family: system-ui, sans-serif;
  font-size: 13.5px;
  color: #6B7280;
  margin: 0;
  text-align: center;
  line-height: 1.5;
}

.error-card-hint {
  font-family: system-ui, sans-serif;
  font-size: 12px;
  color: #9CA3AF;
  margin: 2px 0 0;
  text-align: center;
  line-height: 1.4;
}

.error-card-id {
  margin-top: 8px;
  padding: 4px 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.03);
  font-family: 'Courier New', Courier, monospace;
  font-size: 11px;
  color: #9CA3AF;
  letter-spacing: 0.02em;
}

.error-card-btn {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: #fff;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, transform 0.1s, box-shadow 0.12s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.error-card-btn:hover {
  background: #F9FAFB;
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}
.error-card-btn:active { transform: scale(0.97); }

@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
