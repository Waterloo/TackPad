<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '~/stores/ui'

const uiStore = useUiStore()
const { boardPanMode } = storeToRefs(uiStore)

// Only render on touch devices
const isTouchDevice = ref(false)
onMounted(() => {
  isTouchDevice.value = window.matchMedia('(pointer: coarse)').matches
})
</script>

<template>
  <Transition name="pan-fade">
    <button
      v-if="isTouchDevice"
      class="pan-toggle"
      :class="{ 'pan-toggle--on': boardPanMode }"
      aria-label="Toggle pan mode"
      @click="uiStore.toggleBoardPanMode()"
    >
      <!-- Hand / pan icon -->
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 11V6a2 2 0 00-4 0" />
        <path d="M14 10V4a2 2 0 00-4 0v7" />
        <path d="M10 10.5V6a2 2 0 00-4 0v8" />
        <path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-3.8-.5-5.6-2.3L3.8 17a2 2 0 012.8-2.8L10 17.5" />
      </svg>
    </button>
  </Transition>
</template>

<style scoped>
.pan-toggle {
  position: fixed;
  bottom: 24px;
  left: 64px;
  z-index: 50;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  background: #fff;
  color: #6B7280;
  cursor: pointer;
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.06),
    0 4px 16px rgba(0, 0, 0, 0.06);
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.pan-toggle:active {
  transform: scale(0.92);
}

.pan-toggle--on {
  background: #EFF6FF;
  color: #2563EB;
  border-color: rgba(59, 130, 246, 0.25);
  box-shadow:
    0 1px 4px rgba(59, 130, 246, 0.1),
    0 4px 16px rgba(59, 130, 246, 0.08);
}

/* ── Mobile ──────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .pan-toggle {
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    left: 62px;
    left: calc(62px + env(safe-area-inset-left, 0px));
  }
}

@media (pointer: coarse) {
  .pan-toggle {
    width: 46px;
    height: 46px;
  }
}

/* ── Transition ──────────────────────────────────────────────────── */
.pan-fade-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.pan-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.pan-fade-enter-from { opacity: 0; transform: scale(0.85); }
.pan-fade-leave-to   { opacity: 0; transform: scale(0.85); }
</style>
