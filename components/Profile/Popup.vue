<script setup>
import UserTab from './UserTab.vue'
import SettingsTab from './SettingsTab.vue'

// Container refs and sizing
const container = ref(null)
const containerSize = ref({ width: 0, height: 0 })
const isOpen = ref(false)

// Tab management
const activeTab = ref('user') // 'user' or 'settings'

const updateSize = () => {
  if (container.value) {
    const rect = container.value.getBoundingClientRect()
    containerSize.value = {
      width: rect.width,
      height: rect.height
    }
  }
}

// Methods
const open = () => {
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

const switchTab = (tab) => {
  activeTab.value = tab
}

// Expose methods to parent components
defineExpose({
  open,
  close
})

// Lifecycle hooks
onMounted(() => {
  updateSize()
  window.addEventListener('resize', updateSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSize)
})
</script>

<template>
  <!-- Toggle button -->
  <button 
    @click="isOpen ? close() : open()"
    class="fixed top-4 right-4 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  </button>

  <Teleport to="body">
    <!-- Blurred backdrop with popup -->
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center"
      @click.self="close"
    >
      <!-- Blurred backdrop -->
      <div class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
      
      <!-- Profile popup container -->
      <div 
        ref="container" 
        class="relative w-full max-w-md h-auto z-10"
      >
        <div class="w-full h-full min-w-[250px] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <!-- Header with tabs -->
          <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <button 
                  @click="switchTab('user')"
                  class="px-3 py-1 rounded-full text-sm font-medium transition-colors"
                  :class="{
                    'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300': activeTab === 'user',
                    'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700': activeTab !== 'user'
                  }"
                >
                  Profile
                </button>
                <button 
                  @click="switchTab('settings')"
                  class="px-3 py-1 rounded-full text-sm font-medium transition-colors"
                  :class="{
                    'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300': activeTab === 'settings',
                    'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700': activeTab !== 'settings'
                  }"
                >
                  Settings
                </button>
              </div>
              <button 
                @click="close"
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Content area -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6">
            <!-- User profile tab -->
            <UserTab v-if="activeTab === 'user'" />
            
            <!-- Settings tab -->
            <SettingsTab v-else-if="activeTab === 'settings'" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}
</style>