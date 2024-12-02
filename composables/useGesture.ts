import { ref } from 'vue'

interface Point {
  x: number
  y: number
}

export function useGesture() {
  const startPoint = ref<Point>({ x: 0, y: 0 })
  const lastPoint = ref<Point>({ x: 0, y: 0 })
  const delta = ref<Point>({ x: 0, y: 0 })
  const scale = ref(1)
  const isActive = ref(false)

  function start(e: MouseEvent | TouchEvent) {
    isActive.value = true
    
    if (e instanceof TouchEvent) {
      if (e.touches.length === 1) {
        startPoint.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length === 2) {
        // For pinch, use the midpoint of the two touches
        startPoint.value = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        }
        // Calculate initial distance for pinch
        scale.value = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        )
      }
    } else {
      startPoint.value = { x: e.clientX, y: e.clientY }
    }
    
    lastPoint.value = { ...startPoint.value }
    delta.value = { x: 0, y: 0 }
  }

  function move(e: MouseEvent | TouchEvent) {
    if (!isActive.value) return

    let currentPoint: Point

    if (e instanceof TouchEvent) {
      if (e.touches.length === 1) {
        currentPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        delta.value = {
          x: currentPoint.x - lastPoint.value.x,
          y: currentPoint.y - lastPoint.value.y
        }
      } else if (e.touches.length === 2) {
        // Update midpoint
        currentPoint = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        }
        delta.value = {
          x: currentPoint.x - lastPoint.value.x,
          y: currentPoint.y - lastPoint.value.y
        }
        
        // Update scale
        const currentDistance = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        )
        scale.value = currentDistance
      }
    } else {
      currentPoint = { x: e.clientX, y: e.clientY }
      delta.value = {
        x: currentPoint.x - lastPoint.value.x,
        y: currentPoint.y - lastPoint.value.y
      }
    }

    lastPoint.value = currentPoint!
  }

  function end() {
    isActive.value = false
    delta.value = { x: 0, y: 0 }
    scale.value = 1
  }

  return {
    startPoint,
    lastPoint,
    delta,
    scale,
    isActive,
    start,
    move,
    end
  }
}
