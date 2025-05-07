<template>
  <Modal
    v-model="isOpen"
    title="Delete Board"
    :showCloseButton="true"
    :closeOnBackdropClick="true"
    :closeOnEsc="true"
  >
    <div class="delete-confirmation-content">
      <h2 class="confirmation-title">
        Delete "<span class="board-title">{{ boardTitle }}</span>"
      </h2>
      <p class="confirmation-message">
        Are you sure you want to delete this board?
      </p>
      <p class="delete-warning">
        This action cannot be undone. All content associated with this board will be permanently removed.
      </p>
    </div>

    <template #footer>
      <div class="delete-confirmation-actions">
        <button
          @click="closeModal"
          class="cancel-button"
        >
          Cancel
        </button>
        <button
          class="delete-button"
          @click="$emit('delete-board')"
        >
          Delete Board
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue';
import Modal from '../UI/Modal.vue';
import { useBoardStore } from '~/stores/board';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'delete-board']);

const boardStore = useBoardStore();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const boardTitle = computed(() => {
  if (boardStore.board?.data?.title) {
    return boardStore.board.data.title;
  }
  return 'Untitled Board';
});

const closeModal = () => {
  isOpen.value = false;
};
</script>

<style scoped>
.delete-confirmation-content {
  display: flex;
  flex-direction: column;
  padding: 12px 24px 20px;
}

.confirmation-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333333;
}

.confirmation-message {
  font-size: 16px;
  margin-bottom: 10px;
  color: #4B5563;
}

.board-title {
  color: #4F46E5; /* Indigo color from the home page */
}

.delete-warning {
  color: #6B7280;
  margin-bottom: 0;
  font-size: 14px;
  max-width: 26rem;
  margin-left: auto;
  margin-right: auto;
}

.delete-confirmation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

.cancel-button {
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 500;
  background-color: #ffffff;
  color: #555555;
  border: 1px solid #E5E7EB;
  transition: all 0.2s;
  font-size: 14px;
}

.cancel-button:hover {
  background-color: #f5f5f5;
}

.delete-button {
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 500;
  background-color: #EF4444;
  color: white;
  border: none;
  transition: all 0.2s;
  font-size: 14px;
}

.delete-button:hover {
  background-color: #DC2626;
}
</style>