<script setup lang="ts">
import UserTab from './UserTab.vue'
import SettingsTab from './SettingsTab.vue'
import Modal from '../UI/Modal.vue'
import { useProfileStore } from '~/stores/profileStore'

const profileStore = useProfileStore()

const activeTab = computed(() => profileStore.activeTab)




</script>

<template>
  <!-- Toggle button -->
  <button 
    @click="()=>{profileStore.toggle()}"
    class="fixed top-4 right-4 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  </button>

  <!-- Use Modal component instead of custom implementation -->
  <Modal 
    v-model="profileStore.isProfileOpen"
    :close-on-backdrop-click="true"
    :close-on-esc="true"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center space-x-4">
          <button 
            @click="()=>{profileStore.switchTab('user')}"
            class="px-3 py-1 rounded-full text-sm font-medium transition-colors"
            :class="{
              'bg-blue-900 text-blue-300': activeTab === 'user',
              'text-gray-600 hover:text-blue-300  hover:bg-gray-100 dark:hover:bg-gray-700': activeTab !== 'user'
            }"
          >
            Profile
          </button>
          <button 
            @click="()=>{profileStore.switchTab('settings')}"
            class="px-3 py-1 rounded-full text-sm font-medium transition-colors"
            :class="{
              'bg-blue-900 text-blue-300': activeTab === 'settings',
              'text-gray-600 hover:text-blue-300  hover:bg-gray-100 dark:hover:bg-gray-700': activeTab !== 'settings'
            }"
          >
            Settings
          </button>
        </div>
      </div>
    </template>

    <!-- Content area -->
    <div class="flex-1 overflow-y-auto">
      <!-- User profile tab -->
      <UserTab v-if="activeTab === 'user'" />
      
      <!-- Settings tab -->
      <SettingsTab v-else-if="activeTab === 'settings'" />
    </div>
  </Modal>
</template>

