<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBoardStore } from '~/stores/board'
import { useUiStore } from '~/stores/ui'

const boardStore = useBoardStore()
const uiStore = useUiStore()
const runtimeConfig = useRuntimeConfig()
const { canUndo, canRedo, boardType } = storeToRefs(boardStore)
const { boardSelectMode, pendingTool } = storeToRefs(uiStore)
const tackletsEnabled = computed(() => runtimeConfig.public.tackletsV2Enabled !== false)

// ── Mobile toolbar visibility ─────────────────────────────────────────────────
const mobileToolbarOpen = ref(false)
const isMobile = ref(false)

onMounted(() => {
  const mql = window.matchMedia('(max-width: 640px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => { isMobile.value = e.matches })
})

const tools = [
  {
    id: 'note' as const,
    label: 'Sticky Note',
    shortcut: 'N',
    icon: `<rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity=".15"/>
           <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
           <path d="M7 8h10M7 12h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  {
    id: 'todo' as const,
    label: 'To-do List',
    shortcut: 'T',
    icon: `<path d="M9 6h10M9 12h10M9 18h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
           <circle cx="4.5" cy="6" r="1.5" fill="currentColor" opacity=".4"/>
           <path d="M3.5 12l1 1 2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
           <circle cx="4.5" cy="18" r="1.5" fill="currentColor" opacity=".4"/>`,
  },
  {
    id: 'link' as const,
    label: 'Link Card',
    shortcut: 'L',
    icon: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
           <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'timer' as const,
    label: 'Timer',
    shortcut: 'P',
    icon: `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
           <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
           <path d="M10 2h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  {
    id: 'text' as const,
    label: 'Text',
    shortcut: 'X',
    icon: `<path d="M4 7V4h16v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
           <path d="M12 4v16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
           <path d="M8 20h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  {
    id: 'secret_note' as const,
    label: 'Encrypted Note',
    shortcut: '',
    icon: `<rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
           <path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
           <path d="M9 4V2.5a3 3 0 0 1 6 0V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  {
    id: 'secret_kv' as const,
    label: 'Encrypted Keys',
    shortcut: '',
    icon: `<path d="M8 7h12M8 12h12M8 17h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
           <circle cx="4.5" cy="7" r="1.5" fill="currentColor" opacity=".55"/>
           <circle cx="4.5" cy="12" r="1.5" fill="currentColor" opacity=".55"/>
           <circle cx="4.5" cy="17" r="1.5" fill="currentColor" opacity=".55"/>`,
  },
  {
    id: 'tacklet-directory' as const,
    label: 'Tacklets',
    shortcut: '',
    icon: `<rect x="3" y="3" width="8" height="8" rx="1.4" stroke="currentColor" stroke-width="1.5" fill="none"/>
           <rect x="13" y="13" width="8" height="8" rx="1.4" stroke="currentColor" stroke-width="1.5" fill="none"/>
           <path d="M13 7h8M17 3v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
]

const visibleTools = computed(() => {
  const baseTools = tools.filter(t => tackletsEnabled.value || t.id !== 'tacklet-directory')
  if (boardType.value === 'vault') {
    return baseTools.filter(t => ['text', 'secret_note', 'secret_kv'].includes(t.id))
  }
  return baseTools
})

function onToolClick(toolId: string) {
  if (toolId === 'tacklet-directory') {
    uiStore.openTackletsDirectory()
    return
  }
  if (pendingTool.value === toolId) {
    uiStore.clearPendingTool()
  } else {
    uiStore.setPendingTool(toolId as any)
  }
}
</script>

<template>
  <div class="toolbar-wrap">
    <!-- Mobile FAB toggle -->
    <button
      v-if="isMobile"
      class="toolbar-fab"
      :class="{ 'toolbar-fab--open': mobileToolbarOpen }"
      aria-label="Toggle tools"
      @click="mobileToolbarOpen = !mobileToolbarOpen"
    >
      <Transition name="fab-icon" mode="out-in">
        <svg v-if="!mobileToolbarOpen" key="plus" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <svg v-else key="close" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </Transition>
    </button>

    <Transition name="toolbar-slide">
      <div v-show="!isMobile || mobileToolbarOpen" class="toolbar-pill">
        <!-- Search / Command palette -->
        <div class="tool-item">
          <button
            class="tool-btn"
            aria-label="Search"
            @click="uiStore.toggleCommandPalette()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <div class="tooltip">Search <kbd>⌘K</kbd></div>
        </div>

        <div class="toolbar-sep" />

        <!-- Create tools -->
        <div class="toolbar-group">
          <div v-for="tool in visibleTools" :key="tool.id" class="tool-item">
            <button
              class="tool-btn"
              :class="{ 'tool-btn--active': pendingTool === tool.id }"
              :aria-label="tool.label"
              @click="onToolClick(tool.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" v-html="tool.icon" />
            </button>
            <div class="tooltip">{{ tool.label }}</div>
          </div>
        </div>

        <div v-if="boardType !== 'vault'" class="toolbar-sep" />

        <!-- Upload + record -->
        <div v-if="boardType !== 'vault'" class="toolbar-group">
          <div class="tool-item">
            <button
              class="tool-btn"
              aria-label="Upload file"
              @click="uiStore.openFilePicker()"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            <div class="tooltip">Upload <kbd>Alt+U</kbd></div>
          </div>

          <div class="tool-item">
            <button
              class="tool-btn"
              aria-label="Record voice"
              @click="uiStore.openVoiceRecorder()"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
            <div class="tooltip">Record <kbd>Alt+R</kbd></div>
          </div>
        </div>

        <div v-if="boardType !== 'vault'" class="toolbar-sep" />

        <!-- Select mode toggle -->
        <div class="tool-item">
          <button
            class="tool-btn"
            :class="{ 'tool-btn--active': boardSelectMode }"
            aria-label="Select mode"
            @click="uiStore.toggleBoardSelectMode()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4l7 18 3-7 7-3z" />
            </svg>
          </button>
          <div class="tooltip">Select <kbd>V</kbd></div>
        </div>

        <div v-if="boardType !== 'vault'" class="toolbar-sep" />

        <!-- Draw mode entry -->
        <div v-if="boardType !== 'vault'" class="tool-item">
          <button
            class="tool-btn"
            aria-label="Drawing mode"
            @click="uiStore.enterDrawingMode()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
              <path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
          <div class="tooltip">Draw</div>
        </div>

        <div class="toolbar-sep" />

        <!-- History -->
        <div class="toolbar-group">
          <div class="tool-item">
            <button
              class="tool-btn"
              :class="{ 'tool-btn--disabled': !canUndo }"
              :disabled="!canUndo"
              aria-label="Undo"
              @click="boardStore.undo()"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><!-- Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE --><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9a9 9 0 0 0-6 2.3L3 13"/></g></svg>
            </button>
            <div class="tooltip">Undo <kbd>⌘Z</kbd></div>
          </div>

          <div class="tool-item">
            <button
              class="tool-btn"
              :class="{ 'tool-btn--disabled': !canRedo }"
              :disabled="!canRedo"
              aria-label="Redo"
              @click="boardStore.redo()"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><!-- Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE --><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9a9 9 0 0 1 6 2.3l3 2.7"/></g></svg>
            </button>
            <div class="tooltip">Redo <kbd>⌘⇧Z</kbd></div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toolbar-wrap {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  pointer-events: none;
}

.toolbar-pill {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 9999px;
  padding: 4px 6px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.05);
  pointer-events: auto;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 1px;
}

.toolbar-sep {
  width: 1px;
  height: 20px;
  background: #E5E7EB;
  margin: 0 4px;
  flex-shrink: 0;
}

/* Tool items with tooltip */
.tool-item {
  position: relative;
}

.tool-item:hover .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(-6px);
  pointer-events: none;
}

.tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(0);
  background: #1F2937;
  color: #F9FAFB;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  pointer-events: none;
}

.tooltip kbd {
  font-family: inherit;
  opacity: 0.6;
  margin-left: 4px;
}

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: #1F2937;
}

/* Buttons */
.tool-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: #4B5563;
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease, transform 0.1s ease;
  position: relative;
}

.tool-btn:hover {
  background: #EFF6FF;
  color: #2563EB;
  transform: scale(1.05);
}

.tool-btn:active {
  transform: scale(0.95);
  background: #DBEAFE;
}

.tool-btn--disabled {
  opacity: 0.3;
  cursor: default;
  pointer-events: none;
}

.tool-btn--active {
  background: #EFF6FF;
  color: #2563EB;
}

/* ── Mobile FAB ───────────────────────────────────────────────────── */
.toolbar-fab {
  display: none; /* only visible on mobile via media query */
  width: 48px; height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  color: #2563EB;
  cursor: pointer;
  align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.06);
  pointer-events: auto;
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  z-index: 2;
  flex-shrink: 0;
}
.toolbar-fab:active { transform: scale(0.92); }
.toolbar-fab--open { background: #EFF6FF; }

.fab-icon-enter-active,
.fab-icon-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.fab-icon-enter-from { opacity: 0; transform: rotate(-90deg) scale(0.7); }
.fab-icon-leave-to   { opacity: 0; transform: rotate(90deg) scale(0.7); }

/* ── Slide transition for toolbar pill ────────────────────────────── */
.toolbar-slide-enter-active { transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34,1.4,0.64,1); }
.toolbar-slide-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.toolbar-slide-enter-from   { opacity: 0; transform: translateY(12px) scale(0.95); }
.toolbar-slide-leave-to     { opacity: 0; transform: translateY(12px) scale(0.95); }

/* ── Mobile: vertical left-side toolbar ───────────────────────────── */
@media (max-width: 640px) {
  .toolbar-wrap {
    top: auto;
    bottom: 24px;
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    left: 8px;
    transform: none;
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
    align-items: flex-start;
  }

  .toolbar-fab { display: flex; }

  .toolbar-pill {
    flex-direction: column;
    border-radius: 14px;
    padding: 6px 4px;
    touch-action: none;
  }

  .toolbar-group {
    flex-direction: column;
  }

  .toolbar-sep {
    width: 20px;
    height: 1px;
    margin: 4px 0;
  }

  .tooltip {
    bottom: auto;
    top: 50%;
    left: calc(100% + 8px);
    transform: translateY(-50%);
  }

  .tool-item:hover .tooltip {
    transform: translateY(-50%) translateX(4px);
  }

  .tooltip::after {
    top: 50%;
    left: auto;
    right: 100%;
    transform: translateY(-50%);
    border: 4px solid transparent;
    border-right-color: #1F2937;
    border-top-color: transparent;
  }
}

@media (pointer: coarse) {
  .tool-btn { width: 40px; height: 40px; }
}
</style>
