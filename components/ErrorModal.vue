<script setup lang="ts">
import Modal from './UI/Modal.vue'

const props = withDefaults(defineProps<{
  modelValue?: boolean
  title?: string
  message?: string
}>(), {
  modelValue: false,
  title: 'Error',
  message: 'An unexpected error occurred.',
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

function onCancel() {
  emit('update:modelValue', false)
  emit('cancel')
}

function onConfirm() {
  emit('update:modelValue', false)
  emit('confirm')
}
</script>

<template>
  <Modal 
    v-if="modelValue"
    :model-value="modelValue"
    @update:model-value="(value) => emit('update:modelValue', value)"
    :title="title" 
    :show-close-button="false" 
    :close-on-backdrop-click="false" 
    :close-on-esc="false"
  >
    <div class="">
      <p class="text-gray-600 mb-4">{{ message }}</p>
    </div>
    
    <template #footer>
      <div class="bg-gray-50 rounded-b-lg flex justify-end space-x-3">
        <button 
          @click="onCancel" 
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
        >
          Cancel
        </button>
        <button 
          @click="onConfirm" 
          class="px-4 py-2 bg-[#4F46E5] text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
        >
          ok
        </button>
      </div>
    </template>
  </Modal>
</template>