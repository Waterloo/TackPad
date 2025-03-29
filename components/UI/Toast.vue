
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'info', 'warning'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 5000 // 5 seconds by default
  },
  closable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])

// Toast state
const isVisible = ref(true)
const progress = ref(100)
const interval = ref(null)
const isPaused = ref(false)

// Computed properties
const typeClasses = computed(() => {
  const classes = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  }
  return classes[props.type] || classes.info
})

const iconByType = computed(() => {
  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
    </svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
    </svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clip-rule="evenodd" />
    </svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
    </svg>`
  }
  return icons[props.type] || icons.info
})

const progressBarColor = computed(() => {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }
  return colors[props.type] || colors.info
})

// Methods
const close = () => {
  isVisible.value = false
  clearInterval(interval.value)
  emit('close', props.id)
}

const startTimer = () => {
  if (props.duration <= 0) return
  
  const step = 10 // Update every 10ms for smooth animation
  const totalSteps = props.duration / step
  const decrementPerStep = 100 / totalSteps
  
  clearInterval(interval.value)
  interval.value = setInterval(() => {
    if (!isPaused.value) {
      progress.value -= decrementPerStep
      if (progress.value <= 0) {
        progress.value = 0
        close()
      }
    }
  }, step)
}

const pauseTimer = () => {
  isPaused.value = true
}

const resumeTimer = () => {
  isPaused.value = false
}

// Lifecycle hooks
onMounted(() => {
  startTimer()
})

onUnmounted(() => {
  clearInterval(interval.value)
})
</script>

<template>
  <Transition
    enter-active-class="transform ease-out duration-300 transition"
    enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div 
      v-if="isVisible" 
      class="toast-container max-w-sm w-full shadow-lg rounded-lg pointer-events-auto overflow-hidden"
      :class="typeClasses"
      @mouseenter="pauseTimer"
      @mouseleave="resumeTimer"
    >
      <div class="relative p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0" v-html="iconByType"></div>
          <div class="ml-3 w-0 flex-1 pt-0.5">
            <p v-if="title" class="text-sm font-medium">{{ title }}</p>
            <p class="text-sm">{{ message }}</p>
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button
              v-if="closable"
              @click="close"
              class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span class="sr-only">Close</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Progress bar -->
      <div 
        class="h-1 transition-all duration-100 ease-linear" 
        :class="progressBarColor"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
  </Transition>
</template>

<style scoped>
.toast-container {
  border-width: 1px;
  border-left-width: 4px;
}
</style>