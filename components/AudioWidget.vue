<template>
    <div class="w-full max-w-md mx-auto bg-white p-3 rounded-sm">
      <!-- Editable Title -->
      <div class="mb-4 flex">
        <template v-if="!isEditing">
          <span 
            class="text-center text-sm text-gray-700 mr-2"
            @click="startEditing"
          >
            {{ editableTitle }}
          </span>
          <button 
            @click="startEditing" 
            class="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.379-8.379-2.828-2.828z" />
            </svg>
          </button>
        </template>
        <input 
          v-else
          v-model="editableTitle"
          @blur="stopEditing"
          @keyup.enter="stopEditing"
          class="text-center text-sm text-gray-700 bg-transparent border-b border-gray-300 focus:outline-none"
        />
      </div>
  
      <!-- Audio Player -->
      <div class="bg-blue-500 rounded-full flex items-center p-1 pr-3 space-x-2">
        <!-- Play/Pause Button -->
        <button 
          @click="togglePlay" 
          class="bg-white rounded-full p-2 flex items-center justify-center w-10 h-10 focus:outline-none"
        >
          <svg 
            v-if="isPlaying" 
            xmlns="http://www.w3.org/2000/svg" 
            class="h-6 w-6 text-blue-500" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg 
            v-else 
            xmlns="http://www.w3.org/2000/svg" 
            class="h-6 w-6 text-blue-500" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
  
        <!-- Waveform Container -->
        <div class="flex-grow relative">
          <div ref="waveformContainer" class="w-full h-8"></div>
        </div>
  
        <!-- Time Display -->
        <span class="text-white text-sm w-12 text-right">
          {{ formatTime(currentTime) }}
        </span>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted, watch } from 'vue'
  import WaveSurfer from 'wavesurfer.js'
  
  const props = defineProps({
    itemId: String,
    isSelected: Boolean,
    title: {
      type: String,
      default: 'Audio Track'
    },
    audioUrl: {
      type: String,
      required: true
    }
  })
  
  // Reactive variables
  const editableTitle = ref(props.title)
  const isEditing = ref(false)
  const waveformContainer = ref(null)
  const wavesurfer = ref(null)
  const isPlaying = ref(true)
  const currentTime = ref(0)
  
  // Editing methods
  const startEditing = () => {
    isEditing.value = true
  }
  
  const stopEditing = () => {
    isEditing.value = false
  }
  
  // Play/Pause toggle
  const togglePlay = () => {
    if (wavesurfer.value) {
      wavesurfer.value.playPause()
   
    }
  }
  
  // Time formatting
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Initialize WaveSurfer
  onMounted(() => {
    if (waveformContainer.value) {
      wavesurfer.value = WaveSurfer.create({
        container: waveformContainer.value,
        waveColor: 'white',
        progressColor: 'rgba(255,255,255,0.5)',
        responsive: true,
        height: 30,
        barWidth: 2,
        barRadius: 3,
        barGap: 1,
        backend: 'WebAudio',
        partialRender: true
      })
  
      // Load audio
      wavesurfer.value.load(props.audioUrl)
  
      // Add event listeners
      wavesurfer.value.on('audioprocess', () => {
        currentTime.value = wavesurfer.value.getCurrentTime()
        isPlaying.value = !wavesurfer.value.isPlaying()
      })
  
      wavesurfer.value.on('play', () => {
        isPlaying.value = true
      })
  
      wavesurfer.value.on('pause', () => {
        isPlaying.value = false
      })
    }
  })
  
  // Clean up on unmount
  onUnmounted(() => {
    if (wavesurfer.value) {
      wavesurfer.value.destroy()
    }
  })
  
  // Watch for audio URL changes
  watch(() => props.audioUrl, (newUrl) => {
    if (wavesurfer.value) {
      wavesurfer.value.load(newUrl)
    }
  })
  </script>