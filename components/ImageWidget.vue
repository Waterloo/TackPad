<script setup lang="ts">
import {useImageStore} from '~/stores/imageStore'
const imageStore = useImageStore()
const props = defineProps<{
  itemId: string
  isSelected: boolean
  src: string
  title: string
}>()

const editableTitle = ref(props.title)
const isEditing = ref(false)

const toggleEdit = () => {
  imageStore.updateImageTitle(props.itemId,editableTitle.value)
  isEditing.value = !isEditing.value
}
</script>

<template>
<div class="h-full rounded relative group">
  <img :src="src" class="w-full h-full object-cover">
  
  <div 
    v-if="isSelected && title" 
    class="absolute bottom-0 left-0 right-0 p-3 text-gray-200 bg-black bg-opacity-50 flex items-center"
  >
    <template v-if="!isEditing">
      <span class="flex-grow truncate">{{ editableTitle }}</span>
      <button 
        @click="toggleEdit" 
        class="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.379-8.379-2.828-2.828z" />
        </svg>
      </button>
    </template>
    
    <template v-else>
      <input 
        v-model="editableTitle"
        @blur="toggleEdit"
        @keyup.enter="toggleEdit"
        class="flex-grow bg-transparent text-gray-200 border-b border-gray-300 focus:outline-none"
      />
    </template>
  </div>
</div>
</template>

<style scoped>
/* Optional additional styling */
img {
  transition: transform 0.3s ease;
}

.group:hover img {
  transform: scale(1.05);
}
</style>