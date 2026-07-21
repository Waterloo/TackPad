<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBoardStore } from '~/stores/board'

const boardStore = useBoardStore()
const { scale } = storeToRefs(boardStore)

const displayPct = computed(() => `${Math.round(scale.value * 100)}%`)
</script>

<template>
  <div class="zoom-controls">
    <button class="zoom-btn" title="Zoom out" aria-label="Zoom out" @click="boardStore.zoomBy(1 / 1.2)">
      <!-- minus icon -->
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>

    <button class="zoom-pct" title="Reset zoom" aria-label="Reset zoom" @click="boardStore.zoomReset()">
      {{ displayPct }}
    </button>

    <button class="zoom-btn" title="Zoom in" aria-label="Zoom in" @click="boardStore.zoomBy(1.2)">
      <!-- plus icon -->
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <line x1="7" y1="3" x2="7" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>

    <div class="zoom-sep" />

    <button class="zoom-btn" title="Fit to content" aria-label="Fit to content" @click="boardStore.zoomFit()">
      <!-- expand / fit icon -->
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 5V2h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 9v3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 5V2H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 9v3H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.zoom-controls {
  position: fixed;
  bottom: 24px;
  right: 16px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 3px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.06);
  user-select: none;
}

.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  border-radius: 999px;
  color: #4B5563;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}

.zoom-btn:hover {
  background: #EFF6FF;
  color: #2563EB;
}

.zoom-btn:active {
  background: #DBEAFE;
}

.zoom-pct {
  width: 44px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: #374151;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}

.zoom-pct:hover {
  background: #F3F4F6;
  color: #111827;
}

.zoom-sep {
  width: 1px;
  height: 18px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0 2px;
  flex-shrink: 0;
}

/* ── Mobile ───────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .zoom-controls {
    bottom: 16px;
    right: 8px;
    right: calc(8px + env(safe-area-inset-right, 0px));
  }

  .zoom-pct { display: none; }
}

@media (pointer: coarse) {
  .zoom-btn { width: 36px; height: 36px; }
}
</style>
