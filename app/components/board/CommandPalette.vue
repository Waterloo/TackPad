<script setup lang="ts">
import { useBoardStore } from '~/stores/board'
import { useUiStore } from '~/stores/ui'
import { useWidgetFactory } from '~/composables/widgets/useWidgetFactory'
import type { BoardItem } from '~/shared/types/board'
import ItemPreviewCard from './ItemPreviewCard.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean] }>()

const boardStore = useBoardStore()
const uiStore = useUiStore()
const factory    = useWidgetFactory()
const runtimeConfig = useRuntimeConfig()
const tackletsEnabled = computed(() => runtimeConfig.public.tackletsV2Enabled !== false)

// ── SVG icon snippets ─────────────────────────────────────────────────────────
const IC = {
  note:  `<rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity=".12"/><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M7 8h10M7 12h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  todo:  `<path d="M9 6h10M9 12h10M9 18h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="4.5" cy="6" r="1.5" fill="currentColor" opacity=".5"/><path d="M3.5 12l1 1 2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4.5" cy="18" r="1.5" fill="currentColor" opacity=".5"/>`,
  link:  `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  timer: `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 2h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  text:  `<path d="M4 7V4h16v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 4v16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 20h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  undo:  `<path d="M3 7v6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 13a9 9 0 1 0 2.83-6.36L3 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  redo:  `<path d="M21 7v6h-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13a9 9 0 1 1-2.83-6.36L21 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  zin:   `<circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M11 8v6M8 11h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  zout:  `<circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 11h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  fit:   `<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  reset: `<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  grid:  `<rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M14 17.5h7M17.5 14v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  copy:  `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  items: `<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  upload:`<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  record:`<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="1.5"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
}

interface Command {
  id: string; name: string; category: string
  shortcut?: string; icon: string; action: () => void | Promise<void>
}

const allCommands = computed<Command[]>(() => {
  const createCommands: Command[] = [
    { id:'new-note',    name:'New Note',         category:'Create', shortcut:'Alt+N', icon:IC.note,  action:() => factory.createNote() },
    { id:'new-todo',    name:'New To-do List',   category:'Create', shortcut:'Alt+T', icon:IC.todo,  action:() => factory.createTodo() },
    { id:'new-link',    name:'New Link Card',    category:'Create', shortcut:'Alt+L', icon:IC.link,  action:() => factory.createLink() },
    { id:'new-timer',   name:'New Timer',        category:'Create', shortcut:'Alt+P', icon:IC.timer, action:() => factory.createTimer() },
    { id:'new-text',    name:'New Text Block',   category:'Create', shortcut:'Alt+X', icon:IC.text,  action:() => factory.createText() },
    { id:'new-secret-note', name:'New Encrypted Note', category:'Create', icon:IC.note, action:() => factory.createSecretNote() },
    { id:'new-secret-kv', name:'New Encrypted Keys', category:'Create', icon:IC.items, action:() => factory.createSecretKeyValue() },
  ]
  const visibleCreateCommands = boardStore.boardType === 'vault'
    ? createCommands.filter(cmd => ['new-text', 'new-secret-note', 'new-secret-kv'].includes(cmd.id))
    : createCommands
  if (tackletsEnabled.value && boardStore.boardType !== 'vault') {
    visibleCreateCommands.push({ id:'add-tacklet', name:'Add Tacklet', category:'Create', icon:IC.grid, action:() => uiStore.openTackletsDirectory() })
  }
  return [
    ...visibleCreateCommands,
    ...(boardStore.boardType === 'vault'
      ? []
      : [
          { id:'upload-file', name:'Upload File',      category:'Create', shortcut:'Alt+U', icon:IC.upload, action:() => uiStore.openFilePicker() },
          { id:'record-voice',name:'Record Voice',     category:'Create', shortcut:'Alt+R', icon:IC.record, action:() => uiStore.openVoiceRecorder() },
        ]),
    { id:'undo',        name:'Undo',             category:'Edit',   shortcut:'⌘Z',    icon:IC.undo,  action:() => boardStore.undo() },
    { id:'redo',        name:'Redo',             category:'Edit',   shortcut:'⌘⇧Z',   icon:IC.redo,  action:() => boardStore.redo() },
    { id:'zoom-in',     name:'Zoom In',          category:'View',   shortcut:'+',     icon:IC.zin,   action:() => boardStore.zoomBy(1.2) },
    { id:'zoom-out',    name:'Zoom Out',         category:'View',   shortcut:'−',     icon:IC.zout,  action:() => boardStore.zoomBy(1/1.2) },
    { id:'zoom-reset',  name:'Reset Zoom',       category:'View',   shortcut:'⌘0',    icon:IC.reset, action:() => boardStore.zoomReset() },
    { id:'zoom-fit',    name:'Fit to Content',   category:'View',   shortcut:'⌘⇧1',   icon:IC.fit,   action:() => boardStore.zoomFit() },
    { id:'new-board',   name:'New Board',        category:'Board',                    icon:IC.grid,  action:async () => { const { id } = await $fetch<{id:string}>('/api/board/create', { method:'POST' }); navigateTo(`/board/${id}`) } },
    { id:'open-vault',  name:'Open Vault',       category:'Board',                    icon:IC.items, action:async () => { const { id } = await $fetch<{id:string}>('/api/board/vault', { method:'POST' }); navigateTo(`/board/${id}`) } },
    { id:'copy-link',   name:'Copy Board Link',  category:'Board',                    icon:IC.copy,  action:() => navigator.clipboard.writeText(window.location.href) },
  ]
})

// ── Mode toggle ──────────────────────────────────────────────────────────────
const mode = ref<'commands' | 'items'>('commands')
const crossBoard = ref(false)

const query        = ref('')
const hiIdx        = ref(0)
const inputRef     = ref<HTMLInputElement | null>(null)
const listRef      = ref<HTMLElement | null>(null)

// ── Commands filtering ───────────────────────────────────────────────────────
const filtered = computed(() => {
  if (mode.value !== 'commands') return []
  const q = query.value.toLowerCase().trim()
  if (!q) return allCommands.value
  return allCommands.value.filter(c =>
    c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
  )
})

const grouped = computed(() => {
  const g: Record<string, Command[]> = {}
  for (const cmd of filtered.value) {
    ;(g[cmd.category] ??= []).push(cmd)
  }
  return g
})

function flatIdx(cmd: Command) { return filtered.value.indexOf(cmd) }

// ── Items search ─────────────────────────────────────────────────────────────
interface ItemSearchResult {
  boardId: string
  boardTitle: string
  itemId: string
  kind: string
  text: string
  item: BoardItem | null
}

const itemResults = ref<ItemSearchResult[]>([])
const isSearchingItems = ref(false)
let itemSearchTimer: ReturnType<typeof setTimeout> | undefined

const KIND_COLORS: Record<string, string> = {
  note: '#FDE68A', todo: '#A7F3D0', link: '#C7D2FE', text: '#E5E7EB',
  secret_note: '#E0E7FF', secret_kv: '#FEF3C7',
  image: '#FBCFE8', timer: '#FED7AA', audio: '#DDD6FE', file: '#D1D5DB', tacklet: '#BAE6FD',
}

const KIND_LABELS: Record<string, string> = {
  note: 'Note', todo: 'To-do', link: 'Link', text: 'Text',
  secret_note: 'Encrypted Note', secret_kv: 'Encrypted Keys',
  image: 'Image', audio: 'Audio', file: 'File', timer: 'Timer', tacklet: 'Tacklet',
}

watch([query, crossBoard], ([q, cross]) => {
  clearTimeout(itemSearchTimer)
  const trimmed = (q as string).trim()
  if (trimmed.length < 2) {
    itemResults.value = []
    isSearchingItems.value = false
    return
  }
  isSearchingItems.value = true
  itemSearchTimer = setTimeout(async () => {
    try {
      const params: Record<string, string> = { q: trimmed, include: 'full' }
      if (!cross) params.boardId = boardStore.boardId
      const res = await $fetch<{ results: ItemSearchResult[] }>('/api/search', { params })
      itemResults.value = res.results
    }
    catch { itemResults.value = [] }
    finally { isSearchingItems.value = false }
  }, 300)
})

watch(mode, () => {
  hiIdx.value = 0
})

// ── Inline item hint in commands mode ────────────────────────────────────────
const showItemHint = computed(() => mode.value === 'commands' && itemResults.value.length > 0)

// ── Unified highlight count ──────────────────────────────────────────────────
const totalCount = computed(() => {
  if (mode.value === 'commands') return filtered.value.length + (showItemHint.value ? 1 : 0)
  return itemResults.value.length
})

// ── Lifecycle ────────────────────────────────────────────────────────────────
watch(() => props.modelValue, (v) => {
  if (v) {
    query.value = ''
    hiIdx.value = 0
    mode.value = 'commands'
    itemResults.value = []
    nextTick(() => inputRef.value?.focus())
  }
})

watch(query, () => { hiIdx.value = 0 })

function close() { emit('update:modelValue', false) }

function execute(cmd: Command) { void cmd.action(); close() }

function goToItem(result: ItemSearchResult) {
  if (result.boardId === boardStore.boardId) {
    boardStore.panToItem(result.itemId)
    close()
  }
  else {
    window.open(`/board/${result.boardId}#item=${result.itemId}`, '_blank')
    close()
  }
}

function scrollHi() {
  nextTick(() => {
    listRef.value?.querySelector<HTMLElement>('[data-hi]')?.scrollIntoView({ block:'nearest' })
  })
}

function onKey(e: KeyboardEvent) {
  const len = totalCount.value
  if (e.key === 'Escape') { close(); return }
  if (e.key === 'Tab') {
    e.preventDefault()
    mode.value = mode.value === 'commands' ? 'items' : 'commands'
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    hiIdx.value = len ? (hiIdx.value + 1) % len : 0
    scrollHi()
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    hiIdx.value = len ? (hiIdx.value - 1 + len) % len : 0
    scrollHi()
  }
  else if (e.key === 'Enter') {
    if (mode.value === 'commands') {
      if (showItemHint.value && hiIdx.value === filtered.value.length) {
        mode.value = 'items'
        hiIdx.value = 0
      }
      else {
        const cmd = filtered.value[hiIdx.value]
        if (cmd) execute(cmd)
      }
    }
    else {
      const result = itemResults.value[hiIdx.value]
      if (result) goToItem(result)
    }
  }
}

const searchPlaceholder = computed(() =>
  mode.value === 'items' ? 'Search items…' : 'Search commands…',
)
</script>

<template>
  <Teleport to="body">
    <Transition name="cp">
      <div v-if="modelValue" class="cp-back" @click.self="close">
        <div class="cp-panel" role="dialog" aria-modal="true" aria-label="Command palette">

          <!-- Search -->
          <div class="cp-head">
            <svg class="cp-search-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref="inputRef"
              v-model="query"
              class="cp-input"
              :placeholder="searchPlaceholder"
              autocomplete="off"
              spellcheck="false"
              @keydown="onKey"
            />
            <!-- Searching spinner -->
            <span v-if="isSearchingItems && mode === 'items'" class="cp-spinner cp-spinner--head" />
            <kbd class="cp-esc">ESC</kbd>
          </div>

          <!-- Mode toggle -->
          <div class="cp-mode-bar">
            <div class="cp-seg">
              <button
                class="cp-seg-btn"
                :class="{ 'cp-seg-btn--on': mode === 'commands' }"
                @click="mode = 'commands'"
              >Commands</button>
              <button
                class="cp-seg-btn"
                :class="{ 'cp-seg-btn--on': mode === 'items' }"
                @click="mode = 'items'"
              >Items</button>
            </div>
            <Transition name="cp-fade">
              <div v-if="mode === 'items'" class="cp-scope">
                <button
                  class="cp-scope-btn"
                  :class="{ 'cp-scope-btn--on': !crossBoard }"
                  @click="crossBoard = false"
                >This board</button>
                <button
                  class="cp-scope-btn"
                  :class="{ 'cp-scope-btn--on': crossBoard }"
                  @click="crossBoard = true"
                >All boards</button>
              </div>
            </Transition>
          </div>

          <div class="cp-rule" />

          <!-- Results -->
          <div ref="listRef" class="cp-list">
            <!-- ─── Commands mode ──────────────────────────────── -->
            <template v-if="mode === 'commands'">
              <template v-if="filtered.length">
                <template v-for="(cmds, cat) in grouped" :key="cat">
                  <p class="cp-cat">{{ cat }}</p>
                  <button
                    v-for="cmd in cmds"
                    :key="cmd.id"
                    class="cp-row"
                    :class="{ 'cp-row--on': flatIdx(cmd) === hiIdx }"
                    :data-hi="flatIdx(cmd) === hiIdx ? '' : undefined"
                    @click="execute(cmd)"
                    @mousemove="hiIdx = flatIdx(cmd)"
                  >
                    <span class="cp-ic">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" v-html="cmd.icon" />
                    </span>
                    <span class="cp-name">{{ cmd.name }}</span>
                    <kbd v-if="cmd.shortcut" class="cp-kbd">{{ cmd.shortcut }}</kbd>
                  </button>
                </template>
              </template>
              <!-- Inline item search hint -->
              <template v-if="showItemHint">
                <p class="cp-cat">Items</p>
                <button
                  class="cp-row cp-row--items-hint"
                  :class="{ 'cp-row--on': hiIdx === filtered.length }"
                  :data-hi="hiIdx === filtered.length ? '' : undefined"
                  @click="mode = 'items'; hiIdx = 0"
                  @mousemove="hiIdx = filtered.length"
                >
                  <span class="cp-ic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" v-html="IC.items" />
                  </span>
                  <span class="cp-name">{{ itemResults.length }} board item{{ itemResults.length === 1 ? '' : 's' }} found</span>
                  <span class="cp-hint-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </template>
              <!-- Searching spinner in commands mode -->
              <template v-if="isSearchingItems && query.trim().length >= 2 && !showItemHint">
                <p class="cp-cat">Items</p>
                <div class="cp-row cp-row--items-hint">
                  <span class="cp-spinner" />
                  <span class="cp-name cp-name--muted">Searching items…</span>
                </div>
              </template>
              <p v-if="!filtered.length && !showItemHint" class="cp-empty">No commands found</p>
            </template>

            <!-- ─── Items mode (card grid) ──────────────────────── -->
            <template v-if="mode === 'items'">
              <template v-if="itemResults.length">
                <p class="cp-cat">Items</p>
                <div class="cp-item-grid">
                  <button
                    v-for="(result, idx) in itemResults"
                    :key="`${result.boardId}:${result.itemId}`"
                    class="cp-item-card"
                    :class="{ 'cp-item-card--on': idx === hiIdx }"
                    :data-hi="idx === hiIdx ? '' : undefined"
                    @click="goToItem(result)"
                    @mousemove="hiIdx = idx"
                  >
                    <!-- Item preview (top) -->
                    <div class="cp-item-preview">
                      <ItemPreviewCard
                        v-if="result.item"
                        :item="result.item"
                      />
                      <div v-else class="cp-item-preview-empty">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                      </div>
                    </div>

                    <!-- Info (bottom) -->
                    <div class="cp-item-info">
                      <div class="cp-item-top">
                        <span
                          class="cp-item-kind"
                          :style="{ background: KIND_COLORS[result.kind] || '#E5E7EB' }"
                        >{{ KIND_LABELS[result.kind] || result.kind }}</span>
                        <!-- External board icon -->
                        <svg
                          v-if="result.boardId !== boardStore.boardId"
                          class="cp-item-ext"
                          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                          title="Different board"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </div>
                      <span class="cp-item-text">{{ result.text.slice(0, 60) }}</span>
                      <span v-if="crossBoard" class="cp-item-board">{{ result.boardTitle }}</span>
                    </div>
                  </button>
                </div>
              </template>

              <!-- Empty states -->
              <p v-else-if="!isSearchingItems && query.trim().length >= 2" class="cp-empty">
                No items found for "{{ query.trim() }}"
              </p>
              <p v-else-if="!isSearchingItems" class="cp-empty">
                Type at least 2 characters to search items
              </p>
            </template>
          </div>

          <!-- Footer hint -->
          <div class="cp-foot">
            <span class="cp-foot-hint">
              <kbd>Tab</kbd> switch mode &middot;
              <kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate &middot;
              <kbd>&crarr;</kbd> select &middot;
              <kbd>Esc</kbd> close
            </span>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ────────────────────────────────────────────────────────────── */
.cp-back {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.26);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 92px;
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
.cp-panel {
  width: 540px;
  max-height: 560px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.07);
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.03),
    0 8px 32px rgba(0,0,0,0.12),
    0 32px 64px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Search row ──────────────────────────────────────────────────────────── */
.cp-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; flex-shrink: 0;
}

.cp-search-ic { color: #C4C9D1; flex-shrink: 0; }

.cp-input {
  flex: 1; border: none; outline: none;
  font-size: 15px; font-weight: 400;
  color: #0C0C0C; background: transparent;
  font-family: system-ui, sans-serif;
}
.cp-input::placeholder { color: #C4C9D1; }

.cp-spinner {
  width: 14px; height: 14px;
  border: 1.6px solid #E5E7EB;
  border-top-color: #2563EB;
  border-radius: 50%;
  animation: cp-spin 0.6s linear infinite;
  flex-shrink: 0;
}

.cp-esc {
  font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
  color: #C4C9D1; border: 1px solid #E9EAEC; border-radius: 4px;
  padding: 2px 6px; font-family: system-ui, sans-serif; flex-shrink: 0;
}

/* ── Mode toggle bar ─────────────────────────────────────────────────────── */
.cp-mode-bar {
  padding: 0 16px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cp-seg {
  display: flex;
  background: #F3F4F6;
  border-radius: 8px;
  padding: 2px;
}

.cp-seg-btn {
  height: 26px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-weight: 550;
  font-family: system-ui, sans-serif;
  color: #9CA3AF;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, box-shadow 0.12s;
}
.cp-seg-btn--on {
  background: #fff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.cp-seg-btn:not(.cp-seg-btn--on):hover { color: #6B7280; }

.cp-scope {
  display: flex;
  gap: 4px;
}

.cp-scope-btn {
  height: 24px;
  padding: 0 10px;
  border: 1px solid #EAEBEE;
  border-radius: 6px;
  background: transparent;
  font-size: 11px;
  font-weight: 500;
  font-family: system-ui, sans-serif;
  color: #9CA3AF;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.cp-scope-btn--on {
  background: #EFF6FF;
  color: #2563EB;
  border-color: rgba(37, 99, 235, 0.2);
}
.cp-scope-btn:not(.cp-scope-btn--on):hover {
  border-color: #D1D5DB;
  color: #6B7280;
}

.cp-rule { height: 1px; background: #F3F4F6; flex-shrink: 0; }

/* ── Results ─────────────────────────────────────────────────────────────── */
.cp-list {
  overflow-y: auto; padding: 6px; flex: 1;
}
.cp-list::-webkit-scrollbar { width: 4px; }
.cp-list::-webkit-scrollbar-thumb { background: #E9EAEC; border-radius: 4px; }

.cp-cat {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.09em;
  text-transform: uppercase; color: #D1D5DB;
  padding: 8px 10px 4px; margin: 0;
  font-family: system-ui, sans-serif;
}

/* ── Command row ─────────────────────────────────────────────────────────── */
.cp-row {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 7px 10px; border: none;
  background: transparent; border-radius: 8px;
  cursor: pointer; text-align: left; position: relative;
  transition: background 0.07s;
}
.cp-row:hover { background: #F9FAFB; }
.cp-row--on   { background: #EFF6FF; }
.cp-row--on::before {
  content: ''; position: absolute;
  left: 0; top: 5px; bottom: 5px;
  width: 3px; background: #2563EB;
  border-radius: 0 2px 2px 0;
}

.cp-ic {
  width: 28px; height: 28px; border-radius: 7px;
  background: #F3F4F6; display: flex; align-items: center; justify-content: center;
  color: #6B7280; flex-shrink: 0;
  transition: background 0.07s, color 0.07s;
}
.cp-row--on .cp-ic { background: #DBEAFE; color: #2563EB; }

.cp-name {
  flex: 1; font-size: 13.5px; font-weight: 430;
  color: #111827; font-family: system-ui, sans-serif;
}
.cp-row--on .cp-name { font-weight: 510; color: #1D4ED8; }

.cp-kbd {
  font-size: 10.5px; font-weight: 500;
  color: #9CA3AF; border: 1px solid #E9EAEC;
  border-radius: 4px; padding: 2px 6px;
  font-family: system-ui, sans-serif;
  background: #FAFAFA; white-space: nowrap;
}

.cp-empty {
  padding: 32px; text-align: center;
  font-size: 13px; color: #C4C9D1;
  font-family: system-ui, sans-serif;
}

.cp-row--items-hint {
  border-top: 1px solid #F3F4F6;
  margin-top: 2px;
}

.cp-hint-arrow {
  color: #C4C9D1;
  flex-shrink: 0;
  transition: color 0.07s, transform 0.1s;
}
.cp-row--on .cp-hint-arrow { color: #2563EB; transform: translateX(2px); }

.cp-name--muted { color: #9CA3AF; }

/* ── Item card grid ──────────────────────────────────────────────────────── */
.cp-item-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 2px 2px 4px;
}

.cp-item-card {
  display: flex;
  flex-direction: column;
  border: 1px solid transparent;
  border-radius: 10px;
  background: #FBFBFC;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: background 0.1s, border-color 0.1s, box-shadow 0.1s, transform 0.1s;
}
.cp-item-card:hover {
  background: #fff;
  border-color: #E5E7EB;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transform: translateY(-1px);
}
.cp-item-card--on {
  background: #EFF6FF;
  border-color: rgba(37, 99, 235, 0.18);
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.08);
}
.cp-item-card:active { transform: scale(0.98); }

.cp-item-preview {
  width: 100%;
  overflow: hidden;
  flex-shrink: 0;
}

.cp-item-preview-empty {
  width: 100%;
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F4F5F6;
}

.cp-item-info {
  padding: 7px 9px 9px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.cp-item-top {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cp-item-kind {
  font-size: 8.5px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 14px;
  color: rgba(0,0,0,0.5);
}

.cp-item-ext {
  color: #9CA3AF;
  flex-shrink: 0;
}

.cp-item-text {
  font-size: 11.5px;
  color: #111827;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-family: system-ui, sans-serif;
}

.cp-item-board {
  font-size: 10px;
  color: #9CA3AF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
  font-family: system-ui, sans-serif;
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.cp-foot {
  padding: 7px 14px;
  border-top: 1px solid #F3F4F6;
  flex-shrink: 0;
}

.cp-foot-hint {
  font-size: 10px;
  color: #C0C4CC;
  font-family: system-ui, sans-serif;
}

.cp-foot kbd {
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
  font-family: system-ui, sans-serif;
  color: #9CA3AF;
  line-height: 1;
  margin: 0 1px;
}

/* ── Transitions ─────────────────────────────────────────────────────────── */
.cp-enter-active { transition: opacity 0.14s ease, transform 0.14s cubic-bezier(0.16,1,0.3,1); }
.cp-leave-active { transition: opacity 0.09s ease, transform 0.09s ease; }
.cp-enter-from   { opacity: 0; transform: scale(0.97) translateY(-8px); }
.cp-leave-to     { opacity: 0; transform: scale(0.97) translateY(-4px); }

.cp-fade-enter-active, .cp-fade-leave-active { transition: opacity 0.15s ease; }
.cp-fade-enter-from, .cp-fade-leave-to { opacity: 0; }

@keyframes cp-spin { to { transform: rotate(360deg); } }
</style>
