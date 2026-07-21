<script setup lang="ts">
import type { WidgetKind } from '~~/shared/types/board'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '~/stores/board'

interface ItemPreview {
  kind: WidgetKind
  snippet: string
  x: number
  y: number
  w: number
  h: number
  color?: string
}

interface BoardEntry {
  boardId: string
  role: string
  lastAccessed: string
  title: string
  boardType: 'standard' | 'vault'
  accessLevel: string
  ownerId: string | null
  updatedAt: string
  preview: ItemPreview[]
  itemCount: number
}

interface SearchResult {
  boardId: string
  itemId: string
  kind: string
  text: string
}

interface LegacyImportResponse {
  id: string
  customUrl: string | null
  stats: {
    total: number
    imported: number
    skipped: number
  }
  skipped: Array<{
    legacyItemId: string
    kind?: string
    reason: string
  }>
  title: string
}

const props = defineProps<{ currentBoardId: string; open: boolean }>()
const emit = defineEmits<{ close: []; navigate: [id: string] }>()

// ── Data ───────────────────────────────────────────────────────────────────
const boards = ref<BoardEntry[]>([])
const loading = ref(false)
const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const isSearching = ref(false)
const isCreating = ref(false)
const isImporting = ref(false)
const focusedIndex = ref(-1)
const searchRef = ref<HTMLInputElement | null>(null)
const importInputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLDivElement | null>(null)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deleteTarget = ref<BoardEntry | null>(null)
const boardStore = useBoardStore()
const router = useRouter()
const toast = useToast()

async function fetchBoards() {
  loading.value = true
  try {
    boards.value = await $fetch<BoardEntry[]>('/api/board/list')
  }
  catch { boards.value = [] }
  finally { loading.value = false }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    fetchBoards()
    searchQuery.value = ''
    searchResults.value = []
    focusedIndex.value = -1
    nextTick(() => searchRef.value?.focus())
  }
})

// ── Search ─────────────────────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout> | undefined

const titleFiltered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return boards.value
  return boards.value.filter(b =>
    (b.title || 'Untitled Board').toLowerCase().includes(q),
  )
})

watch(searchQuery, (q) => {
  clearTimeout(searchTimer)
  const trimmed = q.trim()
  if (trimmed.length < 2) {
    searchResults.value = []
    isSearching.value = false
    return
  }
  isSearching.value = true
  searchTimer = setTimeout(async () => {
    try {
      const res = await $fetch<{ results: SearchResult[] }>('/api/search', {
        params: { q: trimmed },
      })
      searchResults.value = res.results
    }
    catch { searchResults.value = [] }
    finally { isSearching.value = false }
  }, 300)
})

const itemMatchBoards = computed(() => {
  if (!searchResults.value.length) return []
  const titleIds = new Set(titleFiltered.value.map(b => b.boardId))
  const grouped = new Map<string, SearchResult[]>()
  for (const r of searchResults.value) {
    if (titleIds.has(r.boardId)) continue
    if (!grouped.has(r.boardId)) grouped.set(r.boardId, [])
    grouped.get(r.boardId)!.push(r)
  }
  const boardMap = new Map(boards.value.map(b => [b.boardId, b]))
  return [...grouped.entries()]
    .map(([id, matches]) => ({ board: boardMap.get(id), matches }))
    .filter(e => e.board)
})

const navigableItems = computed(() => {
  const items: Array<{ id: string }> = []
  for (const b of titleFiltered.value) items.push({ id: b.boardId })
  for (const m of itemMatchBoards.value) {
    if (m.board) items.push({ id: m.board.boardId })
  }
  return items
})

// ── Actions ────────────────────────────────────────────────────────────────

/** Default: switch board in the current tab */
function goToBoard(id: string) {
  if (id === props.currentBoardId) return
  emit('navigate', id)
  emit('close')
}

/** Alt: open board in a new tab */
function openInNewTab(id: string) {
  window.open(`/board/${id}`, '_blank')
  emit('close')
}

async function createNewBoard() {
  if (isCreating.value || isImporting.value) return
  isCreating.value = true
  try {
    const { id } = await $fetch<{ id: string }>('/api/board/create', { method: 'POST' })
    emit('close')
    emit('navigate', id)
  }
  finally { isCreating.value = false }
}

function openImportPicker() {
  if (isImporting.value || isCreating.value) return
  importInputRef.value?.click()
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function getErrorMessage(err: unknown): string {
  const e = err as any
  return String(e?.data?.message ?? e?.data?.statusMessage ?? e?.message ?? 'Import failed')
}

async function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isImporting.value = true
  try {
    const fileContent = await readFileAsText(file)
    const legacyBoard = JSON.parse(fileContent)
    const result = await $fetch<LegacyImportResponse>('/api/board/import-legacy', {
      method: 'POST',
      body: {
        legacyBoard,
        sourceFileName: file.name,
      },
    })

    const detail = result.stats.skipped > 0
      ? `${result.stats.imported} imported, ${result.stats.skipped} skipped`
      : `${result.stats.imported} items imported`

    toast.add({
      severity: 'success',
      summary: 'Board imported',
      detail,
      life: 2800,
    })

    emit('close')
    emit('navigate', result.id)
  }
  catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Import failed',
      detail: getErrorMessage(err),
      life: 3600,
    })
  }
  finally {
    isImporting.value = false
    input.value = ''
  }
}

async function openVaultBoard() {
  if (isCreating.value || isImporting.value) return
  isCreating.value = true
  try {
    const { id } = await $fetch<{ id: string }>('/api/board/vault', { method: 'POST' })
    emit('close')
    emit('navigate', id)
  }
  finally { isCreating.value = false }
}

function askDeleteBoard(board: BoardEntry) {
  deleteTarget.value = board
  showDeleteConfirm.value = true
}

function closeDeleteConfirm(force = false) {
  if (deleting.value && !force) return
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

async function deleteBoard() {
  if (deleting.value || !deleteTarget.value) return
  deleting.value = true
  const target = deleteTarget.value
  try {
    await $fetch(`/api/board/${target.boardId}`, { method: 'DELETE' })
    boardStore.forgetBoard(target.boardId)
    boards.value = boards.value.filter(b => b.boardId !== target.boardId)
    searchResults.value = searchResults.value.filter(r => r.boardId !== target.boardId)
    if (target.boardId === props.currentBoardId) {
      emit('close')
      router.push('/')
    }
    closeDeleteConfirm(true)
  }
  catch (err: any) {
    console.error('[BoardsPopover] Delete failed:', err)
  }
  finally {
    deleting.value = false
  }
}

// ── Keyboard ───────────────────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  const count = navigableItems.value.length
  if (e.key === 'Escape') { e.preventDefault(); emit('close'); return }
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault()
    focusedIndex.value = count ? (focusedIndex.value + 1) % count : -1
    scrollToFocused()
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault()
    focusedIndex.value = count ? (focusedIndex.value - 1 + count) % count : -1
    scrollToFocused()
  }
  if (e.key === 'Enter' && focusedIndex.value >= 0 && focusedIndex.value < count) {
    e.preventDefault()
    goToBoard(navigableItems.value[focusedIndex.value].id)
  }
}

function scrollToFocused() {
  nextTick(() => {
    const el = listRef.value?.querySelector('[data-focused="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

// ── Click outside ──────────────────────────────────────────────────────────
const popoverRef = ref<HTMLElement | null>(null)

function onClickOutside(e: MouseEvent) {
  if (props.open && popoverRef.value && !popoverRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => window.addEventListener('mousedown', onClickOutside, true))
onUnmounted(() => window.removeEventListener('mousedown', onClickOutside, true))

// ── Mini-canvas helpers ────────────────────────────────────────────────────
const KIND_COLORS: Record<string, string> = {
  note:    '#FDE68A',
  todo:    '#A7F3D0',
  link:    '#C7D2FE',
  text:    '#E5E7EB',
  secret_note: '#E0E7FF',
  secret_kv: '#FEF3C7',
  image:   '#FBCFE8',
  timer:   '#FED7AA',
  audio:   '#DDD6FE',
  file:    '#D1D5DB',
  tacklet: '#BAE6FD',
}

const KIND_ICONS: Record<string, string> = {
  note:    '\u{1D4DD}',
  todo:    '\u2713',
  link:    '\u2197',
  text:    'T',
  secret_note: '\u{1F512}',
  secret_kv: '\u{1F511}',
  image:   '\u25A1',
  timer:   '\u25F7',
  audio:   '\u266B',
  file:    '\u25A4',
  tacklet: '\u2726',
}

const ROLE_LABELS: Record<string, { label: string; bg: string; fg: string }> = {
  owner:  { label: 'Owner',  bg: '#DBEAFE', fg: '#1E40AF' },
  editor: { label: 'Editor', bg: '#D1FAE5', fg: '#065F46' },
  viewer: { label: 'Viewer', bg: '#F3F4F6', fg: '#6B7280' },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

// Canvas dimensions for the mini preview (wider for grid cards)
const CANVAS_W = 180
const CANVAS_H = 96

function computeCanvasTransform(items: ItemPreview[]) {
  if (!items.length) return { scale: 1, offsetX: 0, offsetY: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const it of items) {
    minX = Math.min(minX, it.x)
    minY = Math.min(minY, it.y)
    maxX = Math.max(maxX, it.x + it.w)
    maxY = Math.max(maxY, it.y + it.h)
  }
  const pad = 8
  const boundsW = maxX - minX || 1
  const boundsH = maxY - minY || 1
  const s = Math.min((CANVAS_W - pad * 2) / boundsW, (CANVAS_H - pad * 2) / boundsH, 1)
  const fittedW = boundsW * s
  const fittedH = boundsH * s
  return {
    scale: s,
    offsetX: (CANVAS_W - fittedW) / 2 - minX * s,
    offsetY: (CANVAS_H - fittedH) / 2 - minY * s,
  }
}

/** Precomputed transforms per boardId, recalculated when boards changes */
const canvasTransforms = computed(() => {
  const map = new Map<string, ReturnType<typeof computeCanvasTransform>>()
  for (const b of boards.value) {
    map.set(b.boardId, computeCanvasTransform(b.preview))
  }
  return map
})

function getTransform(boardId: string) {
  return canvasTransforms.value.get(boardId) ?? { scale: 1, offsetX: 0, offsetY: 0 }
}

function itemStyle(item: ItemPreview, t: ReturnType<typeof computeCanvasTransform>) {
  return {
    left: (item.x * t.scale + t.offsetX) + 'px',
    top: (item.y * t.scale + t.offsetY) + 'px',
    width: Math.max(6, item.w * t.scale) + 'px',
    height: Math.max(4, item.h * t.scale) + 'px',
    background: item.color || KIND_COLORS[item.kind] || '#E5E7EB',
  }
}
</script>

<template>
  <Transition name="pop">
    <div
      v-if="open"
      ref="popoverRef"
      class="bp"
      @keydown="onKeydown"
    >
      <!-- Top bar -->
      <div class="bp-top">
        <div class="bp-search-wrap">
          <svg class="bp-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref="searchRef"
            v-model="searchQuery"
            class="bp-search"
            placeholder="Search boards..."
            spellcheck="false"
          />
          <Transition name="fade">
            <span v-if="isSearching" class="bp-spin" />
          </Transition>
        </div>
        <button
          class="bp-action"
          :disabled="isImporting || isCreating"
          title="Import board (.json)"
          @click="openImportPicker"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
        <button
          class="bp-action"
          :disabled="isCreating || isImporting"
          title="New board"
          @click="createNewBoard"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          class="bp-action"
          :disabled="isCreating || isImporting"
          title="Open vault"
          @click="openVaultBoard"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 1 1 8 0v3" />
          </svg>
        </button>
        <input
          ref="importInputRef"
          type="file"
          accept="application/json,.json"
          class="bp-import-input"
          @change="onImportFileChange"
        >
      </div>

      <!-- Board grid -->
      <div ref="listRef" class="bp-scroll">
        <!-- Loading skeletons -->
        <div v-if="loading && !boards.length" class="bp-grid">
          <div v-for="i in 4" :key="i" class="bp-skel" />
        </div>

        <template v-if="!loading">
          <!-- Board cards (2-col grid) -->
          <div v-if="titleFiltered.length" class="bp-grid">
            <div
              v-for="(b, idx) in titleFiltered"
              :key="b.boardId"
              class="bp-card"
              :class="{
                'bp-card--active': b.boardId === currentBoardId,
                'bp-card--focused': focusedIndex === idx,
              }"
              :data-focused="focusedIndex === idx"
              @click="goToBoard(b.boardId)"
              @mouseenter="focusedIndex = idx"
            >
              <!-- Canvas preview (top) -->
              <div class="bp-canvas">
                <template v-if="b.preview.length">
                  <div
                    v-for="(item, pi) in b.preview"
                    :key="pi"
                    class="bp-canvas-item"
                    :style="itemStyle(item, getTransform(b.boardId))"
                  />
                </template>
                <div v-else class="bp-canvas-empty">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <!-- Active dot -->
                <span v-if="b.boardId === currentBoardId" class="bp-canvas-dot" />
                <!-- Item count badge -->
                <span v-if="b.itemCount" class="bp-canvas-count">{{ b.itemCount }}</span>
                <!-- New tab button (overlaid on canvas) -->
                <button
                  v-if="b.boardId !== currentBoardId"
                  class="bp-newtab"
                  title="Open in new tab"
                  @click.stop="openInNewTab(b.boardId)"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
              </div>

              <!-- Card info (bottom) -->
              <div class="bp-info">
                <div class="bp-title-row">
                  <span class="bp-title">{{ b.title || 'Untitled Board' }}</span>
                  <span v-if="b.boardType === 'vault'" class="bp-vault-pill">Vault</span>
                </div>
                <div class="bp-meta">
                  <span class="bp-time">{{ relativeTime(b.lastAccessed || b.updatedAt) }}</span>
                  <span
                    v-if="ROLE_LABELS[b.role]"
                    class="bp-role"
                    :style="{ background: ROLE_LABELS[b.role].bg, color: ROLE_LABELS[b.role].fg }"
                  >{{ ROLE_LABELS[b.role].label }}</span>
                  <button
                    v-if="b.role === 'owner'"
                    class="bp-delete-btn"
                    aria-label="Delete board"
                    title="Delete board"
                    @click.stop="askDeleteBoard(b)"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Item search matches -->
          <template v-if="itemMatchBoards.length">
            <div class="bp-match-divider">
              <span>Matching items</span>
            </div>
            <div class="bp-grid">
              <div
                v-for="(entry, eidx) in itemMatchBoards"
                :key="entry.board!.boardId"
                class="bp-card bp-card--match"
                :class="{ 'bp-card--focused': focusedIndex === titleFiltered.length + eidx }"
                :data-focused="focusedIndex === titleFiltered.length + eidx"
                @click="goToBoard(entry.board!.boardId)"
                @mouseenter="focusedIndex = titleFiltered.length + eidx"
              >
                <div class="bp-canvas">
                  <div
                    v-for="(item, pi) in entry.board!.preview.slice(0, 8)"
                    :key="pi"
                    class="bp-canvas-item"
                    :style="itemStyle(item, getTransform(entry.board!.boardId))"
                  />
                </div>
                <div class="bp-info">
                  <span class="bp-title">{{ entry.board!.title || 'Untitled Board' }}</span>
                  <div class="bp-match-snippets">
                    <span
                      v-for="(m, mi) in entry.matches.slice(0, 2)"
                      :key="mi"
                      class="bp-match-tag"
                    >
                      <span class="bp-match-icon" :style="{ color: KIND_COLORS[m.kind] || '#9CA3AF' }">{{ KIND_ICONS[m.kind] || '\u2022' }}</span>
                      {{ m.text.slice(0, 30) }}
                    </span>
                  </div>
                  <div class="bp-meta bp-meta--match">
                    <span
                      v-if="ROLE_LABELS[entry.board!.role]"
                      class="bp-role"
                      :style="{ background: ROLE_LABELS[entry.board!.role].bg, color: ROLE_LABELS[entry.board!.role].fg }"
                    >{{ ROLE_LABELS[entry.board!.role].label }}</span>
                    <button
                      v-if="entry.board!.role === 'owner'"
                      class="bp-delete-btn"
                      aria-label="Delete board"
                      title="Delete board"
                      @click.stop="askDeleteBoard(entry.board!)"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty state -->
          <div v-if="!titleFiltered.length && !itemMatchBoards.length" class="bp-empty">
            <template v-if="searchQuery.trim()">
              <span class="bp-empty-text">No results for "{{ searchQuery.trim() }}"</span>
            </template>
            <template v-else>
              <span class="bp-empty-text">No boards yet</span>
              <button class="bp-empty-cta" @click="createNewBoard">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create board
              </button>
            </template>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="bp-foot">
        <span class="bp-foot-keys"><kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate &middot; <kbd>&crarr;</kbd> open &middot; <kbd>esc</kbd> close</span>
      </div>
    </div>
  </Transition>

  <Teleport to="body">
    <Transition name="bp-overlay">
      <div v-if="showDeleteConfirm" class="bp-confirm-overlay" @click.self="closeDeleteConfirm">
        <div class="bp-confirm-dialog">
          <h3 class="bp-confirm-title">Delete board?</h3>
          <p class="bp-confirm-text">
            <strong>{{ deleteTarget?.title || 'Untitled Board' }}</strong> and all its contents will be permanently deleted.
          </p>
          <div class="bp-confirm-actions">
            <button class="bp-confirm-cancel" @click="closeDeleteConfirm">Cancel</button>
            <button class="bp-confirm-delete" :disabled="deleting" @click="deleteBoard">
              {{ deleting ? 'Deleting...' : 'Delete board' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Popover shell ─────────────────────────────────────────────────────── */
.bp {
  --accent: #2563EB;
  --accent-l: #EFF6FF;
  --ink: #111827;
  --dim: #9CA3AF;
  --border: rgba(0, 0, 0, 0.06);
  --card-bg: #FBFBFC;
  --surface: #fff;

  position: absolute;
  left: 0;
  top: calc(100% + 8px);
  width: 440px;
  max-height: min(580px, calc(100vh - 80px));
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.02),
    0 12px 48px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  touch-action: auto;
  z-index: 2000;
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
}

/* ── Top bar ───────────────────────────────────────────────────────────── */
.bp-top {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 10px 8px;
}

.bp-search-wrap {
  position: relative;
  flex: 1;
}

.bp-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #C0C4CC;
  pointer-events: none;
}

.bp-search {
  width: 100%;
  height: 36px;
  padding: 0 12px 0 32px;
  border: 1px solid #EAEBEE;
  border-radius: 10px;
  background: #F7F8F9;
  font-size: 13px;
  font-family: inherit;
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.bp-search::placeholder { color: #B8BCC4; }
.bp-search:focus {
  border-color: var(--accent);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.bp-spin {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border: 1.6px solid #E5E7EB;
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.bp-action {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #EAEBEE;
  border-radius: 10px;
  background: #F7F8F9;
  color: var(--dim);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.bp-action:hover { background: var(--accent-l); color: var(--accent); border-color: rgba(37, 99, 235, 0.15); }
.bp-action:active { transform: scale(0.95); }
.bp-action:disabled { opacity: 0.4; cursor: default; transform: none; }

.bp-import-input {
  display: none;
}

/* ── Scrollable area ──────────────────────────────────────────────────── */
.bp-scroll {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 10px 10px;
}

.bp-scroll::-webkit-scrollbar { width: 4px; }
.bp-scroll::-webkit-scrollbar-track { background: transparent; }
.bp-scroll::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }

/* ── 2-column card grid ───────────────────────────────────────────────── */
.bp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* ── Board card (vertical: canvas on top, info on bottom) ─────────────── */
.bp-card {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  overflow: hidden;
  transition: background 0.12s, border-color 0.12s, box-shadow 0.12s, transform 0.12s;
}

.bp-card:hover,
.bp-card--focused {
  background: #fff;
  border-color: #E5E7EB;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.bp-card--active {
  background: var(--accent-l);
  border-color: rgba(37, 99, 235, 0.12);
}
.bp-card--active:hover {
  background: #E5EFFF;
  border-color: rgba(37, 99, 235, 0.2);
}

.bp-card:active { transform: scale(0.98); }

/* ── Mini canvas (top of card) ─────────────────────────────────────────── */
.bp-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background:
    radial-gradient(circle at 1px 1px, #E8E9EC 0.5px, transparent 0.5px);
  background-size: 8px 8px;
  background-color: #F4F5F6;
  overflow: hidden;
  flex-shrink: 0;
}

.bp-card--active .bp-canvas {
  background-color: #EBF0FA;
}

.bp-canvas-item {
  position: absolute;
  border-radius: 2px;
  opacity: 0.85;
  box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.08);
  transition: opacity 0.15s;
}

.bp-card:hover .bp-canvas-item { opacity: 1; }

.bp-canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.4;
}

.bp-canvas-dot {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  border: 1.5px solid #fff;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
}

.bp-canvas-count {
  position: absolute;
  bottom: 4px;
  right: 5px;
  font-size: 9px;
  font-weight: 600;
  color: #6B7280;
  background: rgba(255, 255, 255, 0.88);
  padding: 0 4px;
  border-radius: 3px;
  line-height: 14px;
  backdrop-filter: blur(2px);
}

/* ── New-tab button (overlaid on canvas corner) ──────────────────────── */
.bp-newtab {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.6);
  border-radius: 5px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(4px);
  color: #9CA3AF;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, background 0.12s;
}
.bp-card:hover .bp-newtab { opacity: 1; }
.bp-newtab:hover {
  color: var(--accent);
  background: rgba(255,255,255,0.95);
}

/* ── Card info (bottom of card) ───────────────────────────────────────── */
.bp-info {
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.bp-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.bp-title {
  font-size: 12.5px;
  font-weight: 560;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.bp-vault-pill {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 999px;
  background: #FEF3C7;
  color: #92400E;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.bp-card--active .bp-title {
  color: #1D4ED8;
  font-weight: 620;
}

.bp-meta {
  display: flex;
  align-items: center;
  gap: 5px;
}

.bp-meta--match {
  margin-top: 2px;
}

.bp-time {
  font-size: 10.5px;
  color: var(--dim);
}

.bp-role {
  font-size: 8.5px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 14px;
}

.bp-delete-btn {
  margin-left: auto;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #DC2626;
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: 6px;
  padding: 0;
  background: #FEF2F2;
  cursor: pointer;
  flex-shrink: 0;
}

.bp-delete-btn:hover {
  background: #FEE2E2;
  border-color: rgba(220, 38, 38, 0.26);
}

/* ── Match section ─────────────────────────────────────────────────────── */
.bp-match-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 4px 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--dim);
}
.bp-match-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #F0F1F3;
}

.bp-match-snippets {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bp-match-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #6B7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bp-match-icon {
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ── Empty state ───────────────────────────────────────────────────────── */
.bp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px 16px;
}

.bp-empty-text {
  font-size: 13px;
  color: #B0B5BD;
}

.bp-empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 1px solid var(--border);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.bp-empty-cta:hover { background: var(--accent-l); }

/* ── Skeleton ──────────────────────────────────────────────────────────── */
.bp-skel {
  aspect-ratio: 16 / 13;
  border-radius: 12px;
  background: linear-gradient(90deg, #F3F4F6 25%, #EBEDF0 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease infinite;
}

/* ── Footer ────────────────────────────────────────────────────────────── */
.bp-foot {
  padding: 7px 12px;
  border-top: 1px solid #F3F4F6;
}

.bp-foot-keys {
  font-size: 10px;
  color: #C0C4CC;
}

.bp-foot kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 15px;
  padding: 0 3px;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 3px;
  font-size: 9px;
  font-family: inherit;
  color: #9CA3AF;
  line-height: 1;
  margin: 0 1px;
}

/* ── Transitions ───────────────────────────────────────────────────────── */
.pop-enter-active { transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1); }
.pop-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.pop-enter-from   { opacity: 0; transform: translateY(-8px) scale(0.96); }
.pop-leave-to     { opacity: 0; transform: translateY(-4px) scale(0.97); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.bp-overlay-enter-active,
.bp-overlay-leave-active {
  transition: opacity 0.18s ease;
}

.bp-overlay-enter-from,
.bp-overlay-leave-to {
  opacity: 0;
}

.bp-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 16px;
}

.bp-confirm-dialog {
  width: min(420px, 100%);
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  padding: 16px;
}

.bp-confirm-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.bp-confirm-text {
  margin: 8px 0 0;
  font-size: 13px;
  color: #4B5563;
  line-height: 1.4;
}

.bp-confirm-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.bp-confirm-cancel,
.bp-confirm-delete {
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  height: 32px;
  padding: 0 12px;
  cursor: pointer;
}

.bp-confirm-cancel {
  border: 1px solid #D1D5DB;
  background: #fff;
  color: #374151;
}

.bp-confirm-delete {
  border: 1px solid #FCA5A5;
  background: #FEE2E2;
  color: #B91C1C;
}

.bp-confirm-delete:disabled {
  opacity: 0.55;
  cursor: default;
}

@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
@keyframes shimmer { to { background-position: -200% 0; } }

/* ── Mobile responsive ────────────────────────────────────────────── */
@media (max-width: 640px) {
  .bp {
    position: fixed;
    left: 8px;
    right: 8px;
    top: 52px;
    width: auto;
    max-height: calc(100vh - 64px);
    max-height: calc(100dvh - 64px);
    border-radius: 14px;
  }

  .bp-grid {
    grid-template-columns: 1fr;
  }

  .bp-foot { display: none; }

  .bp-newtab { opacity: 1; }
}

@media (pointer: coarse) {
  .bp-action { width: 42px; height: 42px; }
  .bp-search { height: 42px; }
  .bp-card { min-height: 44px; }
}
</style>
