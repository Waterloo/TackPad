<script setup lang="ts">
import { useFileStore } from '~/stores/fileStore'
import { ref } from 'vue'

const fileStore = useFileStore()
const props = defineProps<{
  itemId: string
  title: string
  fileType: string
  fileSize: number
  fileUrl: string
}>()

const editableTitle = ref(props.title)
const isEditing = ref(false)

// Generate a random pastel background color
const backgroundColor = `hsl(${Math.random() * 360}, 70%, 80%)`

const toggleEdit = () => {
  fileStore.updateFileTitle(props.itemId, editableTitle.value)
  isEditing.value = !isEditing.value
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const downloadFile = async () => {
  try {
    const response = await fetch(props.fileUrl);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = props.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Download failed:', error);
  }
}
</script>

<template>
<div class="file-widget flex items-center space-x-3 p-2 rounded-lg">
  <div 
    class="file-type-badge w-24 h-24 rounded-lg flex items-center justify-center text-white font-bold text-xs"
    :style="{ backgroundColor }"
  >
    {{ fileType.toUpperCase() }}
  </div>
  
  <div class="flex-grow min-w-0">
    <template v-if="!isEditing">
      <div 
        @click="isEditing = true" 
        class="cursor-pointer"
      >
        <h3 class="font-medium truncate">{{ editableTitle }}</h3>
        <p class="text-sm text-gray-500">
          {{ formatFileSize(fileSize) }}
        </p>
      </div>
    </template>
    
    <template v-else>
      <input 
        v-model="editableTitle"
        @blur="toggleEdit"
        @keyup.enter="toggleEdit"
        class="w-full bg-transparent border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none"
      />
    </template>
  </div>
  
  <button 
    @click="downloadFile"
    class="text-gray-600 hover:bg-gray-200 rounded-full p-2"
    title="Download file"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 19v2h14v-2H5z"/>
    </svg>
  </button>
</div>
</template>

<style scoped>
.file-widget {
  border: 1px solid #e0e0e0;
  background-color: #f5f5f5;
  max-width: 400px;
}

.file-widget:hover {
  opacity: 0.9;
}
</style>