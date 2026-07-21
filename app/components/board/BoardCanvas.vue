<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePanZoom } from '~/composables/canvas/usePanZoom'
import { useCanvasCoords } from '~/composables/canvas/useCanvasCoords'
import { useBoardStore } from '~/stores/board'
import { useUiStore } from '~/stores/ui'
import SvgLayer from './SvgLayer.vue'

const boardStore = useBoardStore()
const uiStore = useUiStore()

// Canvas state lives in the store; usePanZoom reads and writes these refs directly
const { translateX, translateY, scale } = storeToRefs(boardStore)

const viewportRef = ref<HTMLElement | null>(null)

const { pendingTool } = storeToRefs(uiStore)

const { cursor: panCursor, init, destroy } = usePanZoom(viewportRef, { translateX, translateY, scale }, {
  canTouchPan: () => uiStore.isTouchPanAllowed,
})

const cursor = computed(() => pendingTool.value ? 'crosshair' : panCursor.value)

// Provide coordinate utilities to descendant components (widgets, minimap, etc.)
const coords = useCanvasCoords(translateX, translateY, scale, viewportRef)
provide('canvasCoords', coords)
provide('canvasScale', scale)

onMounted(init)
onUnmounted(destroy)

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const boardStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
}))

const dotGridStyle = computed(() => {
  const s = scale.value
  const tx = translateX.value
  const ty = translateY.value
  const dotRadius = Math.max(0.5, s * 1.5)
  const gridSize = s * 50

  return {
    backgroundImage: `radial-gradient(circle, #C4C4C4 ${dotRadius}px, transparent ${dotRadius}px)`,
    backgroundSize: `${gridSize}px ${gridSize}px`,
    backgroundPosition: `calc(50% + ${tx}px) calc(50% + ${ty}px)`,
  }
})
</script>

<template>
  <div
    ref="viewportRef"
    class="board-viewport"
    :style="{ cursor, ...dotGridStyle }"
  >
    <div class="board-container" :style="boardStyle">
      <div class="origin-wrapper">
        <slot />
        <SvgLayer />
      </div>
    </div>
  </div>
</template>

<style scoped>
.board-viewport {
  position: fixed;
  top: 48px; /* clear BoardHeader */
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  background-color: #F9FAFB;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.board-container {
  position: absolute;
  width: 20000px;
  height: 20000px;
  left: calc(50% - 10000px);
  top: calc(50% - 10000px);
  transform-origin: center;
  will-change: transform;
}

.origin-wrapper {
  position: absolute;
  inset: 0;
  transform: translate(50%, 50%);
}
</style>
