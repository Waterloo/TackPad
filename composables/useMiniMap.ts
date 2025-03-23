import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useBoardStore } from '~/stores/board'
import { usePanZoom } from '~/composables/usePanZoom'
import type { BoardItem } from '~/types/board'

// Constants for minimap sizing
const MINIMAP_WIDTH = 150
const MINIMAP_HEIGHT = 100
const MINIMAP_PADDING = 10
const MIN_ITEM_SIZE = 3 // Minimum size of items in the minimap

export function useMiniMap() {
  const boardStore = useBoardStore()
  const { scale, translateX, translateY } = usePanZoom()

  // Get the board items
  const items = computed(() => boardStore.board?.data.items || [])

  // Calculate bounds of all items
  const bounds = computed(() => {
    if (!items.value.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000 }
    
    const initialBounds = {
      minX: Number.MAX_SAFE_INTEGER,
      minY: Number.MAX_SAFE_INTEGER,
      maxX: Number.MIN_SAFE_INTEGER,
      maxY: Number.MIN_SAFE_INTEGER
    }
    
    const calculatedBounds = items.value.reduce((acc, item) => {
      acc.minX = Math.min(acc.minX, item.x_position)
      acc.minY = Math.min(acc.minY, item.y_position)
      acc.maxX = Math.max(acc.maxX, item.x_position + item.width)
      acc.maxY = Math.max(acc.maxY, item.y_position + item.height)
      return acc
    }, initialBounds)
    
    // Add some padding
    calculatedBounds.minX -= MINIMAP_PADDING * 2
    calculatedBounds.minY -= MINIMAP_PADDING * 2
    calculatedBounds.maxX += MINIMAP_PADDING * 2
    calculatedBounds.maxY += MINIMAP_PADDING * 2
    
    return {
      ...calculatedBounds,
      width: calculatedBounds.maxX - calculatedBounds.minX,
      height: calculatedBounds.maxY - calculatedBounds.minY
    }
  })

  // Calculate scale ratio for minimap
  const scaleRatio = computed(() => {
    const widthRatio = MINIMAP_WIDTH / bounds.value.width
    const heightRatio = MINIMAP_HEIGHT / bounds.value.height
    return Math.min(widthRatio, heightRatio)
  })

  // Convert item positions to minimap positions
  const getItemPosition = (item: BoardItem) => {
    const x = (item.x_position - bounds.value.minX) * scaleRatio.value
    const y = (item.y_position - bounds.value.minY) * scaleRatio.value
    const width = Math.max(item.width * scaleRatio.value, MIN_ITEM_SIZE)
    const height = Math.max(item.height * scaleRatio.value, MIN_ITEM_SIZE)
    
    return { x, y, width, height }
  }

  // Get color based on item type
  const getItemColor = (item: BoardItem) => {
    switch (item.kind) {
      case 'note': return item.content.color || '#FFD700'
      case 'todo': return '#87CEEB'
      case 'link': return '#98FB98'
      case 'timer': return '#FFA07A'
      case 'text': return '#E6E6FA'
      default: return '#CCCCCC'
    }
  }

  // Viewport information
  const viewportRef = ref<HTMLDivElement | null>(null)
  const minimapRef = ref<HTMLDivElement | null>(null)
  const viewport = ref({ x: 0, y: 0, width: 0, height: 0 })

  // Calculate viewport size adjustment factor based on ZOOM_LEVEL
  const viewportSizeAdjustment = computed(() => {
    // Create an inverse relationship with zoom level
    // Lower zoom levels = larger viewport indicator (showing more of the board)
    // Higher zoom levels = smaller viewport indicator (showing less of the board)
    const zoomLevel = boardStore.ZOOM_LEVEL;
    const MAX_ADJUSTMENT = 1.5;  // Maximum scaling factor for the viewport indicator
    const MIN_ADJUSTMENT = 0.7;  // Minimum scaling factor for the viewport indicator
    
    // Adjust based on zoom level (0-3)
    // Level 0 (zoomed out) = larger viewport indicator
    // Level 3 (zoomed in) = smaller viewport indicator
    switch (zoomLevel) {
      case 0: return MAX_ADJUSTMENT;
      case 1: return 1.2;          // Level 1 (overview zoom) - slightly larger than normal
      case 2: return 0.9;          // Level 2 - slightly smaller than normal
      case 3: return MIN_ADJUSTMENT;  // Level 3 (zoomed in) - smallest indicator
      default: return 1.0;         // Default - no adjustment
    }
  })

  // Update viewport size based on window, scale, and translate position
  const updateViewport = () => {
    if (!viewportRef.value || !minimapRef.value) return
    
    // Get visible board area dimensions
    const visibleWidth = window.innerWidth / scale.value
    const visibleHeight = window.innerHeight / scale.value
    
    // Calculate visible area in board coordinates, accounting for translation
    // The board structure consists of:
    // 1. A container with width/height 20000px, left/top -10000px
    // 2. An inner div with transform: translate(50%, 50%)
    
    // First, calculate the position accounting for the translations
    let boardX = -translateX.value / scale.value
    let boardY = -translateY.value / scale.value
    
    // The 50% transform effectively shifts the coordinate system
    // by half the board's dimensions (10000px in each direction)
    // We need to adjust our viewport calculation to account for this
    // boardX += 10000
    // boardY += 10000
    
    // Map board coordinates to minimap coordinates
    const viewX = (boardX - bounds.value.minX) * scaleRatio.value
    const viewY = (boardY - bounds.value.minY) * scaleRatio.value
    
    // Apply the zoom level adjustment to viewport size
    const viewWidth = visibleWidth * scaleRatio.value * viewportSizeAdjustment.value
    const viewHeight = visibleHeight * scaleRatio.value * viewportSizeAdjustment.value
    
    viewport.value = {
      x: viewX,
      y: viewY,
      width: viewWidth,
      height: viewHeight
    }
  }

  // Setup and cleanup functions
  const setupMiniMap = () => {
    updateViewport()
    window.addEventListener('resize', updateViewport)
    
    // Watch for changes and update viewport
    const stopWatchers = [
      watch(scale, updateViewport, { immediate: true }),
      watch(translateX, updateViewport, { immediate: true }),
      watch(translateY, updateViewport, { immediate: true }),
      watch(items, updateViewport, { deep: true }),
      watch(bounds, updateViewport, { deep: true }),
      watch(() => boardStore.ZOOM_LEVEL, updateViewport)
    ]
    
    return () => {
      window.removeEventListener('resize', updateViewport)
      stopWatchers.forEach(stop => stop())
    }
  }

  return {
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
  }
}