<script setup lang="ts">
const props = defineProps<{ color: string }>()
const emit  = defineEmits<{ change: [color: string] }>()

const SWATCHES = [
  { hex: '#FDE68A', label: 'Yellow'  },
  { hex: '#FCA5A5', label: 'Red'     },
  { hex: '#FCD34D', label: 'Amber'   },
  { hex: '#6EE7B7', label: 'Mint'    },
  { hex: '#93C5FD', label: 'Sky'     },
  { hex: '#C4B5FD', label: 'Violet'  },
  { hex: '#D1D5DB', label: 'Stone'   },
]

// Normalise for comparison (uppercase, trimmed)
const activeHex = computed(() => (typeof props.color === 'string' ? props.color : '').toUpperCase().trim())

function isActive(hex: string) {
  return hex.toUpperCase() === activeHex.value
}
</script>

<template>
  <div class="cp-row" role="group" aria-label="Note color">
    <button
      v-for="s in SWATCHES"
      :key="s.hex"
      class="cp-swatch"
      :class="{ 'cp-swatch--active': isActive(s.hex) }"
      :style="{ '--sw': s.hex }"
      :aria-label="s.label"
      :aria-pressed="isActive(s.hex)"
      :title="s.label"
      @click.stop="emit('change', s.hex)"
    />
  </div>
</template>

<style scoped>
.cp-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 2px;
}

.cp-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--sw);
  border: 1.5px solid rgba(0, 0, 0, 0.10);
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  /* ring layer — hidden by default */
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.cp-swatch:hover {
  transform: scale(1.2);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.cp-swatch--active {
  transform: scale(1.18);
  outline-color: var(--sw);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
}

.cp-swatch--active:hover {
  transform: scale(1.25);
}
</style>
