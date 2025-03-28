<template>
    <div
      class="bg-gray-50 text-gray-800 p-2 mx-auto font-sans max-h-[600px] min-h-64 sm:max-w-96 w-full"
    >
      <!-- Upload options -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div 
          class="bg-white p-3 rounded-lg flex flex-col items-center cursor-pointer hover:bg-gray-100 transition-all"
          @click="triggerFilePicker('images')"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            class="mb-2 text-gray-600"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span class="text-sm text-gray-700">Images</span>
          <input 
            type="file" 
            ref="imageInput" 
            accept="image/*" 
            multiple 
            class="hidden" 
            @change="handleFileUpload($event, 'images')"
          >
        </div>
  
        <div 
          class="bg-white p-3 rounded-lg flex flex-col items-center cursor-pointer hover:bg-gray-100 transition-all"
          @click="triggerFilePicker('voice')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
            <path fill="currentColor" d="M8 24q-.425 0-.712-.288T7 23t.288-.712T8 22t.713.288T9 23t-.288.713T8 24m4 0q-.425 0-.712-.288T11 23t.288-.712T12 22t.713.288T13 23t-.288.713T12 24m4 0q-.425 0-.712-.288T15 23t.288-.712T16 22t.713.288T17 23t-.288.713T16 24m-4-10q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2t2.125.875T15 5v6q0 1.25-.875 2.125T12 14m-1 7v-3.1q-2.6-.35-4.3-2.312T5 11h2q0 2.075 1.463 3.538T12 16t3.538-1.463T17 11h2q0 2.625-1.7 4.588T13 17.9V21zm1-9q.425 0 .713-.288T13 11V5q0-.425-.288-.712T12 4t-.712.288T11 5v6q0 .425.288.713T12 12"/>
          </svg>
          <span class="text-sm text-gray-700">Voice Notes</span>
          <input 
            type="file" 
            ref="voiceInput" 
            accept="audio/*" 
            multiple 
            class="hidden" 
            @change="handleFileUpload($event, 'voice')"
          >
        </div>
  
        <div 
          class="bg-white p-3 rounded-lg flex flex-col items-center cursor-pointer hover:bg-gray-100 transition-all"
          @click="triggerFilePicker('files')"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            class="mb-2 text-gray-600"
          >
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
          <span class="text-sm text-gray-700">Other Files</span>
          <input 
            type="file" 
            ref="filesInput" 
            multiple 
            class="hidden" 
            @change="handleFileUpload($event, 'files')"
          >
        </div>
      </div>
  
      <!-- Selected Files Preview -->
      <div v-if="selectedFiles.length > 0" class="mb-4">
        <h3 class="text-sm font-medium mb-2 text-gray-700">Selected Files</h3>
        <div class="grid grid-cols-3 gap-2">
          <div 
            v-for="(file, index) in selectedFiles" 
            :key="index" 
            class="relative"
          >
          
            <!-- Image Preview -->
            <template v-if="file.preview">
                
              <img 
                :src="file.preview" 
                class="w-full h-20 object-cover rounded-lg"
              />
            </template>
            
            <!-- Non-Image File -->
            <template v-else>
              <div class="bg-gray-100 p-2 rounded-lg flex items-center justify-between h-20">
                <span class="text-xs truncate">{{ file.name }}</span>
              </div>
            </template>
            
            <!-- Remove Button -->
            <button 
              @click="removeFile(index)"
              class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        </div>
      </div>
  
      <!-- Drag and Drop Area -->
      <div 
        class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-all"
        @dragover.prevent="dragOver"
        @dragleave.prevent="dragLeave"
        @drop.prevent="handleDrop"
        @click="triggerFilePicker('files')"
      >
        <svg class="mx-auto" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
            <path d="M19 11V9a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>
            <path d="m13 13l9 3l-4 2l-2 4zM3 3v.01M7 3v.01M11 3v.01M15 3v.01M3 7v.01M3 11v.01M3 15v.01"/>
          </g>
        </svg>
        <p class="text-gray-600">
          Drag and drop files here
        </p>
        <p class="text-xs text-gray-500 mt-2">
          Or click to select files
        </p>
      </div>
  
      <!-- Upload Button -->
      <button 
      @click="uploadFilesHandler"
      :disabled="isUploading || selectedFiles.length === 0"
      class="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-300"
    >
      {{ isUploading ? 'Uploading...' : 'Upload' }}
    </button>
    </div>
  </template>
  
  <script setup lang="ts">
import { ref } from 'vue'
import { useUpload } from '@/composables/useUpload'
import { useBoardStore } from '~/stores/board'

const boardStore = useBoardStore();

// Define interface for files with preview
interface FileWithPreview {
  file: File
  preview?: string
}

// Refs for file inputs and selected files
const imageInput = ref<HTMLInputElement | null>(null)
const voiceInput = ref<HTMLInputElement | null>(null)
const filesInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<FileWithPreview[]>([])

// Utility function to check if file is an image
const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/')
}

// Trigger file picker for specific type
const triggerFilePicker = (type: string) => {
  switch(type) {
    case 'images':
      imageInput.value?.click()
      break
    case 'voice':
      voiceInput.value?.click()
      break
    case 'files':
      filesInput.value?.click()
      break
  }
}

// Handle file upload
const handleFileUpload = (event: Event, type: string) => {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (files && files.length > 0) {
    Array.from(files).forEach(file => {
      // Create preview for images
      if (isImageFile(file)) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          selectedFiles.value.push({
            file,
            preview
          })
        }
        reader.readAsDataURL(file)
      } else {
        selectedFiles.value.push({ file })
      }
    })
  }
}

// Remove file from selected files
const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

// Upload functionality
const { isUploading, uploadFiles } = useUpload()

const uploadFilesHandler = async () => {
  if(selectedFiles.value.length === 0) return
  
  // Extract actual files for upload
  const filesToUpload = selectedFiles.value.map(item => item.file)
  
  await uploadFiles(filesToUpload)
  
  // Reset selected files after upload
  selectedFiles.value = []
  boardStore.isFilePickerVisible = false
}

// Drag and Drop Handlers
const dragOver = (event: DragEvent) => {
  event.preventDefault()
  event.currentTarget?.classList.add('border-blue-500')
}

const dragLeave = (event: DragEvent) => {
  event.preventDefault()
  event.currentTarget?.classList.remove('border-blue-500')
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  event.currentTarget?.classList.remove('border-blue-500')

  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    Array.from(files).forEach(file => {
      // Create preview for images
      if (isImageFile(file)) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          selectedFiles.value.push({
            file,
            preview
          })
        }
        reader.readAsDataURL(file)
      } else {
        selectedFiles.value.push({ file })
      }
    })
  }
}
</script>