<script setup>
// Container refs and sizing
const container = ref(null)
const containerSize = ref({ width: 0, height: 0 })

const updateSize = () => {
  if (container.value) {
    const rect = container.value.getBoundingClientRect()
    containerSize.value = {
      width: rect.width,
      height: rect.height
    }
  }
}

// Timer constants
const TIMER_TYPES = {
  FOCUS: 'Focus',
  SHORT_BREAK: 'Short Break',
  LONG_BREAK: 'Long Break'
}

const DEFAULT_DURATIONS = {
  [TIMER_TYPES.FOCUS]: 25,
  [TIMER_TYPES.SHORT_BREAK]: 5,
  [TIMER_TYPES.LONG_BREAK]: 20
}

// State management
const view = ref('timer')
const durations = ref({ ...DEFAULT_DURATIONS })
const currentTimer = ref(TIMER_TYPES.FOCUS)
const isRunning = ref(false)
const timeLeft = ref(DEFAULT_DURATIONS[TIMER_TYPES.FOCUS] * 60)

// Timer interval
let interval
let updateTimeout

// Computed properties
const timerScale = computed(() => {
  const minDimension = Math.min(containerSize.value.width, containerSize.value.height)
  return minDimension * 0.45
})

const fontSize = computed(() => {
  return `${timerScale.value * 0.2}px`
})

const formattedTime = computed(() => {
  const mins = Math.floor(timeLeft.value / 60)
  const secs = timeLeft.value % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

const progress = computed(() => {
  const totalSeconds = durations.value[currentTimer.value] * 60
  return ((totalSeconds - timeLeft.value) / totalSeconds) * 100
})

const progressDasharray = computed(() => 
  `${(progress.value * 282.7433) / 100} 282.7433`
)

// Timer methods
const playNotification = () => {
  const audio = new Audio('/alarm.mp3')
  audio.play().catch(() => console.warn('Audio notification failed to play'))
}

const startTimer = () => {
  if (interval) clearInterval(interval)
  if (timeLeft.value === 0) {
    timeLeft.value = durations.value[currentTimer.value] * 60
  }
  isRunning.value = true
  interval = setInterval(() => {
    if (timeLeft.value <= 1) {
      isRunning.value = false
      timeLeft.value = 0
      playNotification()
      clearInterval(interval)
      interval = null
    } else {
      timeLeft.value--
    }
  }, 1000)
}

const stopTimer = () => {
  clearInterval(interval)
  interval = null
}

const toggleTimer = () => {
  isRunning.value = !isRunning.value
  if (isRunning.value) {
    startTimer()
  } else {
    stopTimer()
  }
}

const resetTimer = () => {
  isRunning.value = false
  stopTimer()
  timeLeft.value = durations.value[currentTimer.value] * 60
}

const switchTimer = (timerType) => {
  if (timerType !== currentTimer.value) {
    currentTimer.value = timerType
    resetTimer()
  }
}

const updateDuration = (timerType, change) => {
  clearTimeout(updateTimeout)
  updateTimeout = setTimeout(() => {
    const newDuration = Math.max(1, Math.min(60, durations.value[timerType] + change))
    durations.value[timerType] = newDuration
    
    if (timerType === currentTimer.value) {
      timeLeft.value = newDuration * 60
    }
  }, 200)
}

// Lifecycle hooks
onMounted(() => {
  updateSize()
  window.addEventListener('resize', updateSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSize)
  stopTimer()
  clearTimeout(updateTimeout)
  timeLeft.value = durations.value[currentTimer.value] * 60
})
</script>

<template>
  <div ref="container" class="timer-container w-full h-full flex items-center justify-center">
    <div class="w-full h-full min-w-[250px] min-h-[200px] bg-white rounded-lg shadow-lg overflow-hidden">
      <!-- Settings View -->
      <div v-if="view === 'settings'" class="h-full flex flex-col">
        <div class="px-4 sm:px-6 py-3 border-b border-gray-100">
          <div class="flex items-center">
            <button 
              @click="view = 'timer'"
              class="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <h2 class="ml-2 text-lg font-semibold text-gray-800">Timer Settings</h2>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div v-for="timerType in Object.values(TIMER_TYPES)" :key="timerType" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ timerType }} Duration
            </label>
            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <span class="text-gray-600">{{ durations[timerType] }} minutes</span>
              <div class="flex items-center space-x-2">
                <button 
                  @click="updateDuration(timerType, -1)"
                  class="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  −
                </button>
                <button 
                  @click="updateDuration(timerType, 1)"
                  class="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 bg-gray-50">
          <button 
            @click="view = 'timer'"
            class="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>

      <!-- Timer View -->
      <div v-else class="h-full flex flex-col">
        <div class="px-4 py-2 border-b border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-lg font-semibold text-gray-800">{{ currentTimer }}</span>
            </div>
            <button 
              class="p-1 text-gray-400 hover:text-gray-600"
              @click="view = 'settings'"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        <div class="timer-content flex-grow flex flex-col items-center justify-center compact-v-space">
          <div class="flex justify-center space-x-2 mb-2">
            <button
              v-for="timerType in Object.values(TIMER_TYPES)"
              :key="timerType"
              class="px-3 py-1 rounded-full text-sm"
              :class="{
                'bg-blue-100 text-blue-700': currentTimer === timerType,
                'text-gray-600 hover:bg-gray-100': currentTimer !== timerType
              }"
              @click="switchTimer(timerType)"
            >
              {{ timerType }}
            </button>
          </div>

          <div class="flex-1 flex items-center justify-center min-h-0">
            <div class="relative" :style="{ width: `${timerScale}px`, height: `${timerScale}px` }">
              <svg class="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#F3F4F6"
                  stroke-width="8"
                  class="transition-all duration-300"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="8"
                  class="text-blue-500 transition-all duration-300"
                  stroke-linecap="round"
                  transform="rotate(-90 50 50)"
                  :stroke-dasharray="progressDasharray"
                />
              </svg>
              
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="font-semibold text-gray-800" :style="{ fontSize }">
                  {{ formattedTime }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex justify-center space-x-4 mt-2">
            <button 
              @click="toggleTimer"
              :class="[
                'px-6 py-2 rounded-lg font-medium transition-colors',
                isRunning 
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              ]"
            >
              {{ isRunning ? 'Stop' : 'Start' }}
            </button>
            <button 
              @click="resetTimer"
              class="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timer-container {
  min-width: 250px;
  min-height: 200px;
}

.timer-content {
  padding: 0.5rem;
}

.compact-v-space > * + * {
  margin-top: 0.5rem;
}
</style>