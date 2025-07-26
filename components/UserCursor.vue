<template>
  <div
    class="user-cursor"
    :style="{
      transform: `translate(${cursor.x}px, ${cursor.y}px)`,
      zIndex: 1000,
      pointerEvents: 'none',
      position: 'absolute',
      left: 0,
      top: 0
    }"
  >
    <!-- Cursor pointer -->
    <div class="cursor-pointer">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="cursor-svg"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          :fill="user.color"
          stroke="#ffffff"
          stroke-width="1"
        />
      </svg>
    </div>

    <!-- User name label -->
    <div
      class="cursor-label"
      :style="{
        backgroundColor: user.color,
        color: getContrastColor(user.color)
      }"
    >
      {{ user.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  user: User
  cursor: {
    x: number
    y: number
    timestamp: number
  }
}

defineProps<Props>()

// Helper function to determine text color based on background
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const color = hexColor.replace('#', '')

  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5 ? '#000000' : '#ffffff'
}
</script>

<style scoped>
.user-cursor {
  will-change: transform;
  transition: transform 0.1s ease-out;
}

.cursor-pointer {
  position: relative;
  width: 24px;
  height: 24px;
}

.cursor-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.cursor-label {
  position: absolute;
  top: 20px;
  left: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Smooth entrance animation */
.user-cursor {
  animation: cursorEnter 0.2s ease-out;
}

@keyframes cursorEnter {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
