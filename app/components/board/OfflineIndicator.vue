<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBoardStore } from '~/stores/board'
import { useOnline } from '@vueuse/core'

const boardStore = useBoardStore()
const { isServerSynced } = storeToRefs(boardStore)
const isOnline = useOnline()

// Show banner when browser is offline OR when online but server never synced
// (e.g. server down). Once synced, never show for that session.
const hasEverSynced = ref(false)
watch(isServerSynced, val => { if (val) hasEverSynced.value = true })

const showOffline = computed(() => !isOnline.value)
</script>

<template>
  <Transition name="slide-down">
    <div v-if="showOffline" class="offline-banner">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="offline-icon">
        <path d="M1 1l12 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M9.5 4.9A5.5 5.5 0 0 1 12.6 7 5.5 5.5 0 0 1 7 12.5c-1.1 0-2.1-.32-2.95-.87" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M4.4 4.4A5.5 5.5 0 0 0 1.4 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M6.2 6.2A2 2 0 0 0 7 10a2 2 0 0 0 1.5-.68" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      <span>Working offline — changes saved locally</span>
    </div>
  </Transition>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  background: #1F2937;
  color: #F9FAFB;
  font-size: 12px;
  font-weight: 500;
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  white-space: nowrap;
  pointer-events: none;
}

.offline-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.slide-down-enter-active, .slide-down-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
