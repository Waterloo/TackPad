<script setup lang="ts">
import { useBoardStore } from '~/stores/board'
import type { Timer, TimerMode } from '~/shared/types/board'

const props = defineProps<{ itemId: string }>()
const boardStore = useBoardStore()

const item = computed(() => boardStore.items.get(props.itemId) as Timer | undefined)

const MODES: { label: TimerMode, defaultMinutes: number }[] = [
  { label: 'Focus', defaultMinutes: 25 },
  { label: 'Short Break', defaultMinutes: 5 },
  { label: 'Long Break', defaultMinutes: 15 },
]

// Local timer state (not synced via Yjs — each user has their own countdown)
const secondsLeft = ref(0)
const isRunning = ref(false)
const isFinished = ref(false)
let interval: ReturnType<typeof setInterval> | null = null

function configuredSeconds() {
  return (item.value?.content.duration ?? 25 * 60)
}

function reset() {
  stopInterval()
  isRunning.value = false
  isFinished.value = false
  secondsLeft.value = configuredSeconds()
}

function stopInterval() {
  if (interval) { clearInterval(interval); interval = null }
}

function toggle() {
  if (isFinished.value) { reset(); return }
  if (isRunning.value) {
    stopInterval()
    isRunning.value = false
  }
  else {
    isRunning.value = true
    isFinished.value = false
    interval = setInterval(() => {
      secondsLeft.value -= 1
      if (secondsLeft.value <= 0) {
        secondsLeft.value = 0
        isRunning.value = false
        isFinished.value = true
        stopInterval()
      }
    }, 1000)
  }
}

function selectMode(mode: TimerMode, defaultMinutes: number) {
  if (!item.value) return
  boardStore.updateItem(props.itemId, {
    content: { timerType: mode, duration: defaultMinutes * 60 },
  })
  reset()
}

// Re-initialize when configured duration changes
watch(() => item.value?.content.duration, () => reset(), { immediate: true })

onUnmounted(stopInterval)

const minutes = computed(() => Math.floor(secondsLeft.value / 60))
const seconds = computed(() => secondsLeft.value % 60)

const displayTime = computed(() =>
  `${String(minutes.value).padStart(2, '0')}:${String(seconds.value).padStart(2, '0')}`,
)

const modeColor = computed(() => {
  switch (item.value?.content.timerType) {
    case 'Focus': return { bg: '#FFF7ED', accent: '#F97316', text: '#9A3412' }
    case 'Short Break': return { bg: '#F0FDF4', accent: '#22C55E', text: '#166534' }
    case 'Long Break': return { bg: '#EFF6FF', accent: '#3B82F6', text: '#1E40AF' }
    default: return { bg: '#FFF7ED', accent: '#F97316', text: '#9A3412' }
  }
})

const progressPct = computed(() => {
  const total = configuredSeconds()
  if (!total) return 0
  return ((total - secondsLeft.value) / total) * 100
})
</script>

<template>
  <div
    v-if="item"
    class="timer-root"
    :style="{ '--t-bg': modeColor.bg, '--t-accent': modeColor.accent, '--t-text': modeColor.text }"
  >
    <!-- Mode tabs -->
    <div class="mode-tabs">
      <button
        v-for="mode in MODES"
        :key="mode.label"
        class="mode-tab"
        :class="{ 'mode-tab-active': item.content.timerType === mode.label }"
        @click.stop="selectMode(mode.label, mode.defaultMinutes)"
      >
        {{ mode.label }}
      </button>
    </div>

    <!-- Progress ring + time display -->
    <div class="timer-center" :class="{ 'timer-flash': isFinished }">
      <svg class="progress-ring" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" class="ring-track" />
        <circle
          cx="40" cy="40" r="34"
          class="ring-fill"
          :style="{
            strokeDashoffset: 213.63 - (213.63 * progressPct / 100),
            stroke: modeColor.accent,
          }"
        />
      </svg>
      <div class="time-display">{{ displayTime }}</div>
    </div>

    <!-- Controls -->
    <div class="timer-controls">
      <button class="ctrl-btn ctrl-reset" title="Reset" @click.stop="reset">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

      <button
        class="ctrl-btn ctrl-play"
        :title="isRunning ? 'Pause' : 'Start'"
        @click.stop="toggle"
      >
        <!-- Play -->
        <svg v-if="!isRunning" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <!-- Pause -->
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.timer-root {
  width: 100%;
  height: 100%;
  background: var(--t-bg, #FFF7ED);
  border-radius: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 12px 10px 14px;
  box-sizing: border-box;
  overflow: hidden;
}

/* Mode tabs */
.mode-tabs {
  display: flex;
  gap: 3px;
  background: rgba(0,0,0,0.05);
  border-radius: 8px;
  padding: 3px;
  width: 100%;
}

.mode-tab {
  flex: 1;
  font-size: 10px;
  font-weight: 600;
  padding: 4px 2px;
  border: none;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  color: rgba(0,0,0,0.45);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.mode-tab-active {
  background: #fff;
  color: var(--t-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Center ring */
.timer-center {
  position: relative;
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timer-flash {
  animation: flash 0.5s ease 3;
}

@keyframes flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.progress-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.ring-track {
  fill: none;
  stroke: rgba(0,0,0,0.08);
  stroke-width: 4;
}

.ring-fill {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 213.63;
  transition: stroke-dashoffset 1s linear, stroke 0.3s ease;
}

.time-display {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--t-text);
  font-variant-numeric: tabular-nums;
  position: relative;
  z-index: 1;
}

/* Controls */
.timer-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.1s;
}

.ctrl-btn:active { transform: scale(0.92); }

.ctrl-reset {
  width: 30px;
  height: 30px;
  background: rgba(0,0,0,0.06);
  border-radius: 50%;
  color: rgba(0,0,0,0.4);
}

.ctrl-reset:hover { background: rgba(0,0,0,0.1); color: rgba(0,0,0,0.65); }

.ctrl-play {
  width: 42px;
  height: 42px;
  background: var(--t-accent);
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.ctrl-play:hover { filter: brightness(1.05); }
</style>
