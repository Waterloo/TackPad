<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useMiniMap } from '~/composables/useMiniMap'
import { useBoardStore } from '~/stores/board'
import { usePanZoom } from '~/composables/usePanZoom'

// Use the MiniMap composable to get all functionality
const {
  MINIMAP_WIDTH,
  MINIMAP_HEIGHT,
  minimapRef,
  viewportRef,
  viewport,
  items,
  getItemPosition,
  getItemColor,
  setupMiniMap,
  scaleRatio,
  bounds
} = useMiniMap()

// State to track if minimap is visible
const isMinimapVisible = ref(false)

// Toggle minimap visibility
const toggleMinimap = () => {
  isMinimapVisible.value = !isMinimapVisible.value
}

// Board store for updating position
const boardStore = useBoardStore()
const { scale } = usePanZoom()

// Dragging state
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

// Handle minimap click to jump to position
const handleMinimapClick = (e: MouseEvent) => {
  if (isDragging.value) return
  
  // Get click position relative to minimap
  const rect = minimapRef.value?.getBoundingClientRect()
  if (!rect) return
  
  const minimapX = e.clientX - rect.left
  const minimapY = e.clientY - rect.top
  
  // Convert minimap position to board coordinates
  const boardX = (minimapX / scaleRatio.value) + bounds.value.minX
  const boardY = (minimapY / scaleRatio.value) + bounds.value.minY
  
  // Center the board on the clicked position
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  
  // Update board position
  boardStore.setTranslateX(centerX - boardX * scale.value)
  boardStore.setTranslateY(centerY - boardY * scale.value)
}

// Start dragging the viewport
const startDrag = (e: PointerEvent) => {
  if (!minimapRef.value) return
  
  // Prevent default behavior to avoid text selection
  e.preventDefault()
  
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  
  // Set pointer capture to track pointer movement even outside minimap
  minimapRef.value.setPointerCapture(e.pointerId)
}

// Handle dragging the viewport
const handleDrag = (e: PointerEvent) => {
  if (!isDragging.value || !minimapRef.value) return
  
  // Calculate drag delta in minimap coordinates
  const deltaX = e.clientX - dragStartX.value
  const deltaY = e.clientY - dragStartY.value
  
  // Reset start position for next move
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  
  // Convert minimap delta to board coordinates
  const boardDeltaX = deltaX / scaleRatio.value
  const boardDeltaY = deltaY / scaleRatio.value
  
  // Update board position (negate values since translateX/Y work in opposite direction)
  boardStore.setTranslateX(boardStore.translateX - boardDeltaX * scale.value)
  boardStore.setTranslateY(boardStore.translateY - boardDeltaY * scale.value)
}

// End dragging
const endDrag = (e: PointerEvent) => {
  if (!isDragging.value) return
  
  isDragging.value = false
  
  // Release pointer capture
  if (minimapRef.value) {
    minimapRef.value.releasePointerCapture(e.pointerId)
  }
}

// Set up and clean up
let cleanupFunction: (() => void) | undefined
onMounted(() => {
  cleanupFunction = setupMiniMap()
})

onUnmounted(() => {
  if (cleanupFunction) cleanupFunction()
})
</script>

<template>
  <div class="minimap-container">
    <!-- Toggle button -->
    <div class="minimap-toggle flex justify-end p-2">
      <button 
        @click="toggleMinimap"
        class="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label="Toggle minimap"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600">
          <rect x="2" y="2" width="20" height="20" rx="2"></rect>
          <rect x="8" y="8" width="8" height="8" rx="1"></rect>
        </svg>
      </button>
    </div>
    
    <div 
      v-if="isMinimapVisible"
      ref="minimapRef"
      class="minimap"
      :style="{
        width: `${MINIMAP_WIDTH}px`,
        height: `${MINIMAP_HEIGHT}px`
      }"
      @pointerdown="startDrag"
      @pointermove="handleDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @click="handleMinimapClick"
    >
      <!-- Board items as squares -->
      <div 
        v-for="item in items" 
        :key="item.id"
        class="minimap-item"
        :style="{
          left: `${getItemPosition(item).x}px`,
          top: `${getItemPosition(item).y}px`,
          width: `${getItemPosition(item).width}px`,
          height: `${getItemPosition(item).height}px`,
          backgroundColor: getItemColor(item)
        }"
      ></div>
      
      <!-- Current viewport indicator -->
      <div 
        ref="viewportRef"
        class="minimap-viewport"
        :style="{
          left: `${viewport.x}px`,
          top: `${viewport.y}px`,
          width: `${viewport.width}px`,
          height: `${viewport.height}px`,
          transition: isDragging ? 'none' : 'width 0.2s, height 0.2s'
        }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.minimap-container {
  position: relative;
  border-radius: 4px;
  margin-bottom: 8px;
  overflow: hidden;
}

.minimap {
  position: relative;
  background-color: #f5f5f5;
  border: 2px solid #a6a9d1;
  border-radius: 4px;
  overflow: hidden;
  user-select: none;
  touch-action: none;
  cursor: grab;
}

.minimap:active {
  cursor: grabbing;
}

.minimap-item {
  position: absolute;
  border-radius: 2px;
}

.minimap-viewport {
  position: absolute;
  border: 1px solid rgba(0, 123, 255, 0.8);
  background-color: rgba(0, 123, 255, 0.2);
  border-radius: 2px;
  pointer-events: none;
}
</style>
