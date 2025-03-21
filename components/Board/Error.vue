<template>
  <Modal v-model="showModal" :title="title" :closeOnBackdropClick="true" :closeOnEsc="true">
    <div class="error-content">
      <p class="error-message">{{ message }}</p>
      <!-- <a v-if="actionLink" :href="actionLink.url" class="error-action-link" @click="handleActionClick">
        {{ actionLink.text }}
      </a> -->
    </div>
    
    <template #footer>
      <button 
        class="btn btn-primary"
        @click="navigateTo(actionLink)"
      >
        OK
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed } from 'vue';
import Modal from '../UI/Modal.vue';

const props = defineProps({
  // Control show/hide state of the error modal
  modelValue: {
    type: Boolean,
    default: false
  },
  // Title for the error modal
  title: {
    type: String,
    default: 'Error'
  },
  // Error message to display
  message: {
    type: String,
    required: true
  },
  // Optional action link with URL and text
  actionLink: {
    type: String,
    default: null,
  }
});

const emit = defineEmits(['update:modelValue', 'action-click']);

// Compute showModal based on modelValue for v-model binding
const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// Handle close button click
function close() {
  emit('update:modelValue', false);
}

// Handle action link click
function handleActionClick(event) {
  // Emit event for custom handling
  emit('action-click');
  
  // If it's an external link, let it proceed naturally
  // If it's an internal action that should prevent navigation, 
  // the parent can call preventDefault in its handler
}
</script>

<style scoped>
.error-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.error-message {
  margin: 0;
  line-height: 1.5;
  color: #333333;
}

.error-action-link {
  color: #0066cc;
  text-decoration: none;
  font-weight: 500;
}

.error-action-link:hover {
  text-decoration: underline;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #0066cc;
  color: white;
}

.btn-primary:hover {
  background-color: #0055aa;
}
</style>