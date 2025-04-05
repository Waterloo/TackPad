<script setup>
import { computed } from 'vue'

// Props for storage data with default values
const props = defineProps({
  consumption: {
    type: Number,
    default: 6670681
  },
  limit: {
    type: Number,
    default: 250000000
  },
  plan: {
    type: String,
    default: 'Free'
  }
})

// Computed values
const usedPercentage = computed(() => {
  return (props.consumption / props.limit) * 100
})

const formattedUsed = computed(() => {
  return (props.consumption / 1000000).toFixed(1) + ' MB'
})

const formattedTotal = computed(() => {
  return (props.limit / 1000000).toFixed(1) + ' MB'
})

// Color based on usage
const barColor = computed(() => {
  if (usedPercentage.value < 50) return 'bg-blue-500'
  if (usedPercentage.value < 85) return 'bg-amber-500'
  return 'bg-rose-500'
})
</script>

<template>
  <div class="storage-indicator">
    <!-- Simple header -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center">
        <span class="text-sm font-bold text-gray-700">Storage</span>
        <span class="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">{{ plan }} Plan</span>
      </div>
      <span class="text-sm text-gray-500">{{ formattedUsed }} / {{ formattedTotal }}</span>
    </div>
    
    <!-- Linear progress bar -->
    <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div 
        class="h-full transition-all duration-500 ease-in-out" 
        :class="barColor"
        :style="{ width: `${Math.min(usedPercentage, 100)}%` }"
      ></div>
    </div>
    <div class="text-sm py-4 float-end">Need more storage? <NuxtLink class="text-blue-500 font-bold">Upgrade</NuxtLink> </div>
  </div>
</template>

<style scoped>
.storage-indicator {
  padding: 0.75rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
</style>