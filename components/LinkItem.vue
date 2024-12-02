<template>
  <div class="h-full flex flex-col bg-white p-4 rounded-lg">
    <!-- Regular Link Content -->
    <template v-if="!isOEmbed">
      <img 
        v-if="item.content.image"
        :src="item.content.image" 
        :alt="item.content.title"
        class="w-full h-32 object-cover rounded-md user-select-none"
      />
      <div v-else class="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
        <div class="text-4xl text-gray-400">🔗</div>
      </div>
      <h3 class="mt-3 font-medium text-gray-800 text-lg">{{ item.content.title }}</h3>
      <p v-if="item.content.description === 'Loading metadata...'" class="mt-2 text-sm text-gray-500 flex items-center gap-2">
        <span class="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></span>
        {{ item.content.description }}
      </p>
      <p v-else-if="item.content.description" class="mt-2 text-sm text-gray-600">{{ item.content.description }}</p>
      <p v-else class="mt-2 text-sm text-gray-400 italic">No description available</p>
      <a 
        :href="item.content.url" 
        class="mt-auto pt-2 text-sm text-blue-500 hover:text-blue-600"
        target="_blank"
        @mousedown.stop
      >
        {{ getHostname(item.content.url) }}
      </a>
    </template>

    <!-- oEmbed Content -->
    <template v-else>
      <div class="p-4 h-full flex flex-col">
        <div 
          v-html="item.content.html" 
          class="w-full h-full flex-grow relative"
          @mousedown.stop
        ></div>
        <a 
          :href="item.content.url" 
          class="mt-2 text-sm text-blue-500 hover:text-blue-600"
          target="_blank"
          @mousedown.stop
        >
          {{ getHostname(item.content.url) }}
        </a>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  item: {
    id: string
    content: {
      url: string
      title: string
      description: string
      image?: string
      html?: string
    }
  }
  isSelected: boolean
}>()

const isOEmbed = computed(() => !!props.item.content.html)

function getHostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
</script>

<style scoped>
.link-item {
  min-width: 300px;
  min-height: 300px;
}
</style>