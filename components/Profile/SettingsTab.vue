<script setup>
import { ref, onMounted, watch } from 'vue'
import DeleteBoardModal from './Delete.vue'
import { useBoardStore } from '~/stores/board'

const boardStore = useBoardStore()

const isOldBoard = computed(() => boardStore.isOldBoard)
const isOwner = computed(() => boardStore.isOwner)
// Color scheme settings
const colorScheme = ref('system') // 'light', 'dark', or 'system'

// Initialize color scheme from local storage or system preference
onMounted(() => {
  // Get saved preference from localStorage
  const savedScheme = localStorage.getItem('color-scheme')
  if (savedScheme) {
    colorScheme.value = savedScheme
    applyColorScheme(savedScheme)
  } else {
    // Default to system preference
    colorScheme.value = 'system'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyColorScheme(prefersDark ? 'dark' : 'light')
  }
})

// Watch for changes to color scheme
watch(colorScheme, (newValue) => {
  localStorage.setItem('color-scheme', newValue)
  applyColorScheme(newValue)
})

// Apply the color scheme to the document
const applyColorScheme = (scheme) => {
  const root = document.documentElement
  
  if (scheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', scheme === 'dark')
  }
}
let deleteOpen = ref(false)

const {deleteBoard} = useBoard()
function handleDeleteBoard() {
  deleteBoard()
  }
</script>

<template>
  <div class="settings-tab space-y-6">
    <div>
      <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
        Appearance
      </h3>
      
      <div class="space-y-4">
        <!-- Color scheme selection -->
        <div>
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Color Scheme
          </h4>
          
          <div class="grid grid-cols-3 gap-3">
            <!-- Light mode option -->
            <button 
              @click="colorScheme = 'light'"
              class="flex flex-col items-center justify-center p-3 rounded-lg border transition-colors"
              :class="[
                colorScheme === 'light' 
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700' 
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              ]"
            >
              <div class="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-600">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              </div>
              <span class="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Light
              </span>
            </button>
            
            <!-- Dark mode option -->
            <button 
              @click="colorScheme = 'dark'"
              class="flex flex-col items-center justify-center p-3 rounded-lg border transition-colors"
              :class="[
                colorScheme === 'dark' 
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700' 
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              ]"
            >
              <div class="w-8 h-8 bg-indigo-900 rounded-full flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-100">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              </div>
              <span class="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Dark
              </span>
            </button>
            
            <!-- System mode option -->
            <button 
              @click="colorScheme = 'system'"
              class="flex flex-col items-center justify-center p-3 rounded-lg border transition-colors"
              :class="[
                colorScheme === 'system' 
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700' 
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              ]"
            >
              <div class="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600 dark:text-gray-300">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <span class="text-sm text-gray-700 dark:text-gray-300 font-medium">
                System
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isOldBoard!== true && isOwner === true">
      
      <div>
        <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
        Delete Board
      </h3>
      <button
        @click="deleteOpen = true"
        class="delete-button"
      >
        Delete Board
      </button>
      <DeleteBoardModal
        v-model="deleteOpen"
        @delete-board="handleDeleteBoard"
      />
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.settings-tab {
  min-height: 300px;
}

.delete-button {
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 500;
  background-color: #EF4444;
  color: white;
  border: none;
  transition: all 0.2s;
  font-size: 14px;
}

</style>