<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '~/stores/ui'
import { useDrawingStore } from '~/stores/drawing'
import type { DrawingTool } from '~/shared/types/drawing'

const uiStore = useUiStore()
const drawingStore = useDrawingStore()
const { activeTool } = storeToRefs(uiStore)
const { activeStyle, canUndo, canRedo, selectedDrawingIds, drawings } = storeToRefs(drawingStore)

// ── Group / Ungroup logic ────────────────────────────────────────────────────
const canGroup = computed(() => {
  if (selectedDrawingIds.value.size < 2) return false
  const ids = [...selectedDrawingIds.value]
  const groups = new Set(ids.map(id => drawings.value.get(id)?.groupId).filter(Boolean))
  if (groups.size === 1 && ids.every(id => drawings.value.get(id)?.groupId !== undefined)) return false
  return true
})

const canUngroup = computed(() => {
  if (selectedDrawingIds.value.size < 1) return false
  const ids = [...selectedDrawingIds.value]
  const firstGroupId = drawings.value.get(ids[0]!)?.groupId
  if (!firstGroupId) return false
  return ids.every(id => drawings.value.get(id)?.groupId === firstGroupId)
})

const canDelete = computed(() => selectedDrawingIds.value.size >= 1)

// ── Popover state ────────────────────────────────────────────────────────────
type PopoverKey = 'shapes' | 'lines' | 'stroke' | 'fill' | 'width' | null
const openPopover = ref<PopoverKey>(null)

function togglePopover(key: PopoverKey) {
  openPopover.value = openPopover.value === key ? null : key
}

// Close popover on outside click
const toolbarRef = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (toolbarRef.value && !toolbarRef.value.contains(e.target as Node)) {
    openPopover.value = null
  }
}
onMounted(() => document.addEventListener('pointerdown', onDocClick))
onUnmounted(() => document.removeEventListener('pointerdown', onDocClick))

// ── Tools ────────────────────────────────────────────────────────────────────

// "Last used" memory for grouped tools — defaults shown as the trigger icon
const lastShape = ref<DrawingTool>('rect')
const lastLine = ref<DrawingTool>('arrow')

const SHAPE_TOOLS: { tool: DrawingTool; label: string }[] = [
  { tool: 'rect',     label: 'Rectangle' },
  { tool: 'ellipse',  label: 'Ellipse' },
  { tool: 'diamond',  label: 'Diamond' },
  { tool: 'triangle', label: 'Triangle' },
]

const LINE_TOOLS: { tool: DrawingTool; label: string }[] = [
  { tool: 'arrow', label: 'Arrow' },
  { tool: 'line',  label: 'Line' },
]

// SVG paths for each tool icon (viewBox 0 0 24 24)
const TOOL_ICONS: Record<string, string> = {
  select:   'M4 2l10 8-4 1 2.5 5-2 1-2.5-5-3 3z',
  pen:      'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  rect:     'M3 5h18v14H3z',
  ellipse:  'M12 4a8 8 0 100 16A8 8 0 0012 4z',
  diamond:  'M12 2l10 10-10 10L2 12z',
  triangle: 'M12 3L22 20H2z',
  arrow:    'M4 12h13M13 7l5 5-5 5',
  line:     'M3 21L21 3',
  text:     'M4 6h16M4 12h8M4 18h12',
}

// True if a shape tool is currently active (so we highlight the shape trigger)
const isShapeActive = computed(() => SHAPE_TOOLS.some(s => s.tool === activeTool.value))
const isLineActive = computed(() => LINE_TOOLS.some(l => l.tool === activeTool.value))

// ── Colour palettes ──────────────────────────────────────────────────────────
const STROKE_COLORS = [
  '#374151', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF',
]

const FILL_COLORS = [
  'none', '#FEF9C3', '#DCFCE7', '#DBEAFE',
  '#F3E8FF', '#FEE2E2', '#FFEDD5', '#F9FAFB',
]

const STROKE_WIDTHS = [1, 2, 4, 6]

// ── Actions ──────────────────────────────────────────────────────────────────
function selectTool(tool: DrawingTool) {
  uiStore.setTool(tool)
  openPopover.value = null
}

function selectShape(tool: DrawingTool) {
  lastShape.value = tool
  selectTool(tool)
}

function selectLine(tool: DrawingTool) {
  lastLine.value = tool
  selectTool(tool)
}

function setStroke(color: string) {
  drawingStore.applyStyleToSelected({ stroke: color })
}

function setFill(fill: string) {
  drawingStore.applyStyleToSelected({ fill })
}

function setStrokeWidth(w: number) {
  drawingStore.applyStyleToSelected({ strokeWidth: w })
}

function deleteSelected() {
  const ids = [...selectedDrawingIds.value]
  for (const id of ids) drawingStore.removeDrawing(id)
}
</script>

<template>
  <div ref="toolbarRef" class="dt">
    <!-- ── Exit ──────────────────────────────────────────────────────── -->
    <button
      class="dt-btn dt-exit"
      title="Exit drawing mode (Escape)"
      @click="uiStore.exitDrawingMode()"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
    </button>

    <div class="dt-sep" />

    <!-- ── Undo / Redo ───────────────────────────────────────────────── -->
    <div class="flex flex-col gap-2">
      <button class="dt-btn" :class="{ 'dt-btn--dim': !canUndo }" :disabled="!canUndo" title="Undo" @click="drawingStore.undo()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><!-- Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE --><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9a9 9 0 0 0-6 2.3L3 13"/></g></svg>
      </button>
      <button class="dt-btn" :class="{ 'dt-btn--dim': !canRedo }" :disabled="!canRedo" title="Redo" @click="drawingStore.redo()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><!-- Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE --><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9a9 9 0 0 1 6 2.3l3 2.7"/></g></svg>
      </button>
    </div>

    <!-- ── Group / Ungroup (contextual) ──────────────────────────────── -->
    <template v-if="activeTool === 'select' && (canGroup || canUngroup || canDelete)">
      <div class="dt-sep" />
      <button v-if="canGroup" class="dt-btn" title="Group selected" @click="drawingStore.groupSelected()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="8" height="8" rx="1.5" /><rect x="14" y="14" width="8" height="8" rx="1.5" /><path d="M10 6h8v8" />
        </svg>
      </button>
      <button v-if="canUngroup" class="dt-btn" title="Ungroup" @click="drawingStore.ungroupSelected()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="8" height="8" rx="1.5" /><rect x="14" y="14" width="8" height="8" rx="1.5" /><path d="M18 6H6v12" stroke-dasharray="3 2" />
        </svg>
      </button>
      <button v-if="canDelete" class="dt-btn" title="Delete selected" @click="deleteSelected()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <rect x="6" y="6" width="12" height="14" rx="1.5" />
          <path d="M10 10v6M14 10v6" />
        </svg>
      </button>
    </template>

    <div class="dt-sep" />

    <!-- ── Direct tools: Select, Pan (mobile), Pen ───────────────────── -->
    <button
      class="dt-btn" :class="{ 'dt-btn--on': activeTool === 'select' }"
      title="Select (V)" @click="selectTool('select')"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="TOOL_ICONS.select" /></svg>
    </button>

    <button
      class="dt-btn" :class="{ 'dt-btn--on': activeTool === 'pen' }"
      title="Pen (P)" @click="selectTool('pen')"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="TOOL_ICONS.pen" /></svg>
    </button>

    <!-- ── Shapes popover trigger ────────────────────────────────────── -->
    <div class="dt-popwrap">
      <button
        class="dt-btn dt-btn--caret" :class="{ 'dt-btn--on': isShapeActive }"
        title="Shapes" @click="togglePopover('shapes')"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="TOOL_ICONS[lastShape]" /></svg>
        <span class="dt-caret" />
      </button>
      <Transition name="pop">
        <div v-if="openPopover === 'shapes'" class="dt-pop">
          <button
            v-for="s in SHAPE_TOOLS" :key="s.tool"
            class="dt-pop-btn" :class="{ 'dt-pop-btn--on': activeTool === s.tool }"
            :title="s.label" @click="selectShape(s.tool)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="TOOL_ICONS[s.tool]" /></svg>
            <span class="dt-pop-label">{{ s.label }}</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- ── Lines popover trigger ─────────────────────────────────────── -->
    <div class="dt-popwrap">
      <button
        class="dt-btn dt-btn--caret" :class="{ 'dt-btn--on': isLineActive }"
        title="Lines" @click="togglePopover('lines')"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="TOOL_ICONS[lastLine]" /></svg>
        <span class="dt-caret" />
      </button>
      <Transition name="pop">
        <div v-if="openPopover === 'lines'" class="dt-pop">
          <button
            v-for="l in LINE_TOOLS" :key="l.tool"
            class="dt-pop-btn" :class="{ 'dt-pop-btn--on': activeTool === l.tool }"
            :title="l.label" @click="selectLine(l.tool)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="TOOL_ICONS[l.tool]" /></svg>
            <span class="dt-pop-label">{{ l.label }}</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- ── Text ──────────────────────────────────────────────────────── -->
    <button
      class="dt-btn" :class="{ 'dt-btn--on': activeTool === 'text' }"
      title="Text (T)" @click="selectTool('text')"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="TOOL_ICONS.text" /></svg>
    </button>

    <div class="dt-sep" />

    <!-- ── Stroke colour trigger ─────────────────────────────────────── -->
    <div class="dt-popwrap">
      <button class="dt-btn dt-btn--swatch" title="Stroke color" @click="togglePopover('stroke')">
        <span
          class="dt-swatch-dot"
          :style="{
            background: activeStyle.stroke,
            boxShadow: activeStyle.stroke === '#FFFFFF' ? 'inset 0 0 0 1px #D1D5DB' : 'none',
          }"
        />
        <span class="dt-swatch-line" :style="{ background: activeStyle.stroke }" />
      </button>
      <Transition name="pop">
        <div v-if="openPopover === 'stroke'" class="dt-pop dt-pop--grid">
          <div class="dt-pop-heading">Stroke</div>
          <div class="dt-color-grid">
            <button
              v-for="c in STROKE_COLORS" :key="c"
              class="dt-color" :class="{ 'dt-color--on': activeStyle.stroke === c }"
              :style="{
                background: c,
                boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1.5px #D1D5DB' : 'none',
              }"
              @click="setStroke(c)"
            />
          </div>
        </div>
      </Transition>
    </div>

    <!-- ── Fill colour trigger ───────────────────────────────────────── -->
    <div class="dt-popwrap">
      <button class="dt-btn dt-btn--swatch" title="Fill color" @click="togglePopover('fill')">
        <span
          class="dt-swatch-dot dt-swatch-dot--fill"
          :style="{
            background: activeStyle.fill === 'none' ? 'transparent' : activeStyle.fill,
            boxShadow: activeStyle.fill === 'none' ? 'inset 0 0 0 1px #D1D5DB' : 'none',
          }"
        >
          <svg v-if="activeStyle.fill === 'none'" width="10" height="10" viewBox="0 0 12 12"><line x1="1" y1="11" x2="11" y2="1" stroke="#EF4444" stroke-width="1.5" /></svg>
        </span>
      </button>
      <Transition name="pop">
        <div v-if="openPopover === 'fill'" class="dt-pop dt-pop--grid">
          <div class="dt-pop-heading">Fill</div>
          <div class="dt-color-grid">
            <button
              v-for="f in FILL_COLORS" :key="f"
              class="dt-color" :class="{ 'dt-color--on': activeStyle.fill === f }"
              :style="{
                background: f === 'none' ? 'transparent' : f,
                boxShadow: f === 'none' ? 'inset 0 0 0 1.5px #D1D5DB' : 'none',
              }"
              @click="setFill(f)"
            >
              <svg v-if="f === 'none'" width="10" height="10" viewBox="0 0 12 12"><line x1="1" y1="11" x2="11" y2="1" stroke="#EF4444" stroke-width="1.5" /></svg>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ── Width trigger ─────────────────────────────────────────────── -->
    <div class="dt-popwrap">
      <button class="dt-btn dt-btn--swatch" title="Stroke width" @click="togglePopover('width')">
        <span class="dt-width-preview" :style="{ height: `${activeStyle.strokeWidth + 1}px` }" />
      </button>
      <Transition name="pop">
        <div v-if="openPopover === 'width'" class="dt-pop dt-pop--widths">
          <div class="dt-pop-heading">Width</div>
          <button
            v-for="w in STROKE_WIDTHS" :key="w"
            class="dt-width-btn" :class="{ 'dt-width-btn--on': activeStyle.strokeWidth === w }"
            @click="setStrokeWidth(w)"
          >
            <span class="dt-width-bar" :style="{ height: `${w + 1}px` }" />
            <span class="dt-width-label">{{ w }}px</span>
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* ── Container ─────────────────────────────────────────────────────────────── */
.dt {
  position: fixed;
  left: 12px;
  top: 60px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 14px;
  padding: 6px 5px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 6px 24px rgba(0, 0, 0, 0.07);
  user-select: none;
  width: 42px;
}

/* ── Buttons ───────────────────────────────────────────────────────────────── */
.dt-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6B7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background 0.1s, color 0.1s;
  flex-shrink: 0;
}
.dt-btn:hover { background: #F3F4F6; color: #1F2937; }
.dt-btn--on { background: #EFF6FF; color: #3B82F6; }
.dt-btn--dim { opacity: 0.3; cursor: default; }

/* Exit button */
.dt-exit { background: #FEF2F2; color: #EF4444; }
.dt-exit:hover { background: #FEE2E2; color: #DC2626; }

/* Caret indicator for popover triggers */
.dt-btn--caret { padding-right: 2px; }
.dt-caret {
  position: absolute;
  right: 2px;
  bottom: 3px;
  width: 0; height: 0;
  border-left: 2.5px solid transparent;
  border-right: 2.5px solid transparent;
  border-top: 3px solid currentColor;
  opacity: 0.4;
}

/* Swatch trigger — shows a preview dot/line */
.dt-btn--swatch {
  flex-direction: column;
  gap: 2px;
}

.dt-swatch-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dt-swatch-dot--fill { border-radius: 4px; }

.dt-swatch-line {
  width: 18px; height: 2px;
  border-radius: 1px;
}

.dt-width-preview {
  width: 18px;
  background: #374151;
  border-radius: 1px;
  min-height: 2px;
}

/* ── Separator ─────────────────────────────────────────────────────────────── */
.dt-sep {
  width: 24px;
  height: 1px;
  background: #F0F0F0;
  margin: 1px 0;
  flex-shrink: 0;
}

/* ── Pair (undo/redo side by side) ─────────────────────────────────────────── */
.dt-pair {
  display: flex;
  gap: 1px;
}

/* ── Popover wrapper ───────────────────────────────────────────────────────── */
.dt-popwrap { position: relative; }

.dt-pop {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 6px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 8px 32px rgba(0, 0, 0, 0.08);
  z-index: 40;
  min-width: max-content;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Connector nub pointing back at toolbar */
.dt-pop::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 8px; height: 8px;
  background: #fff;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.dt-pop-heading {
  font-size: 9px;
  font-weight: 700;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 4px 4px;
}

/* ── Popover tool button (shapes / lines) ──────────────────────────────────── */
.dt-pop-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #4B5563;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
}
.dt-pop-btn:hover { background: #F3F4F6; color: #111827; }
.dt-pop-btn--on { background: #EFF6FF; color: #3B82F6; }

.dt-pop-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

/* ── Color grid popover ────────────────────────────────────────────────────── */
.dt-pop--grid { padding: 6px 8px 8px; }
.dt-color-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.dt-color {
  width: 24px; height: 24px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s, border-color 0.12s;
}
.dt-color:hover { transform: scale(1.12); }
.dt-color--on { border-color: #3B82F6; }

/* ── Width popover ─────────────────────────────────────────────────────────── */
.dt-pop--widths { padding: 6px 8px 8px; gap: 3px; }
.dt-width-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 8px;
  border: 1.5px solid transparent;
  border-radius: 7px;
  background: #FAFAFA;
  cursor: pointer;
  transition: border-color 0.1s, background 0.1s;
}
.dt-width-btn:hover { background: #F3F4F6; }
.dt-width-btn--on { border-color: #3B82F6; background: #EFF6FF; }

.dt-width-bar {
  width: 32px;
  background: #374151;
  border-radius: 1px;
  min-height: 2px;
}
.dt-width-label {
  font-size: 11px;
  font-weight: 500;
  color: #9CA3AF;
  min-width: 24px;
}

/* ── Popover transitions ───────────────────────────────────────────────────── */
.pop-enter-active { transition: opacity 0.15s ease, transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1); }
.pop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.pop-enter-from { opacity: 0; transform: translateY(-50%) translateX(-6px) scale(0.95); }
.pop-leave-to   { opacity: 0; transform: translateY(-50%) translateX(-4px) scale(0.97); }

/* ── Mobile ────────────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .dt { left: 8px; top: 56px; width: 44px; }
}

@media (pointer: coarse) {
  .dt-btn { width: 34px; height: 34px; }
  .dt-exit { width: 34px; height: 34px; }
  .dt-color { width: 28px; height: 28px; }
  .dt-pop-btn { padding: 8px 12px 8px 10px; }
}
</style>
