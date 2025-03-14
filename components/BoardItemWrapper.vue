<template>
  <div
    @wheel.stop
    ref="itemRef"
    class="board-item absolute  rounded-lg"
    :class="{ 
      'ring-2 ring-blue-500': isSelected,
      'select-none': isMoving || isResizing,
      'cursor-move': !isResizing,
      'shadow-lg': props.shadow ?? true
    }"
    :style="[
      style,
      { touchAction: 'none' }
    ]"
    @mousedown.stop="startMove"
    @touchstart.stop.prevent="startMove"
    @click.stop="$emit('select', itemId)"
  >
    <div class="w-full h-full">
      <slot />
    </div>
    <template v-if="isSelected">
      <div
        v-for="handle in resizeHandles"
        :key="handle"
        class="resize-handle"
        :class="[
          `resize-handle-${handle}`,
          'touch-handle'
        ]"
        @mousedown.stop="(e) => startResize(handle, e)"
        @touchstart.stop.prevent="(e) => startResize(handle, e)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useItemInteraction } from '~/composables/useItemInteraction'

const props = defineProps<{
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  itemId: string
  isSelected: boolean
  shadow?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'update:position', updates: Partial<typeof props.position>): void
}>()

const {
  style,
  isMoving,
  isResizing,
  startMove,
  startResize
} = useItemInteraction(props.position, (updates) => {
  // Ensure we pass all position properties when updating
  const updatedPosition = {
    ...props.position,
    ...updates
  }
  emit('update:position', updatedPosition)
}, {
  minWidth: 200,
  minHeight: 200,
  grid: 1
})

const resizeHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
</script>

<style scoped>
.board-item {
  /* background: white; */
  z-index: 10;
  -webkit-user-select: none;
  user-select: none;
  will-change: transform;
}

.board-item:hover {
  z-index: 11;
}

.resize-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid #4299e1;
  border-radius: 50%;
  z-index: 20;
  will-change: transform;
}

.resize-handle-n {
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.resize-handle-s {
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.resize-handle-e {
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.resize-handle-w {
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.resize-handle-ne {
  top: -8px;
  right: -8px;
  cursor: nesw-resize;
}

.resize-handle-nw {
  top: -8px;
  left: -8px;
  cursor: nwse-resize;
}

.resize-handle-se {
  bottom: -8px;
  right: -8px;
  cursor: nwse-resize;
}

.resize-handle-sw {
  bottom: -8px;
  left: -8px;
  cursor: nesw-resize;
}

@media (max-width: 768px) {
  .touch-handle {
    width: 24px;
    height: 24px;
    transform: translate(-50%, -50%);
  }
}
</style>
