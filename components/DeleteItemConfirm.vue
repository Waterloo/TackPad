<template>
    <Modal
      v-model="isOpen"
      title="Delete Item"
      :showCloseButton="true"
      :closeOnBackdropClick="true"
      :closeOnEsc="true"
    >
      <div class="delete-confirmation-content">
        <h2 class="confirmation-title">
          Delete "<span class="board-title">{{ item?.kind }}</span>"
        </h2>
        <p class="confirmation-message">
          Are you sure you want to delete this item?
        </p>
   
      </div>
  
      <template #footer>
        <div class="delete-confirmation-actions">
          <button
            @click="isOpen = false"
            class="cancel-button"
          >
            Cancel
          </button>
          <button
            class="delete-button"
            @click="()=>{
                $emit('delete')
                isOpen = false
            }"
          >
            Delete Item
          </button>
        </div>
      </template>
    </Modal>
  </template>
  
  <script setup>

  import Modal from './UI/Modal.vue';
  import { useBoardStore } from '~/stores/board';

  const boardStore = useBoardStore();
  const selectedItem = computed(() => boardStore.selectedId);
  const itemStore = useItemStore();
  const item = computed(() => itemStore.getItemById(selectedItem.value));
  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    }
  });
  
  const emit = defineEmits(['update:modelValue', 'delete']);
  

  
  const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  });


  </script>
  
  <style scoped>

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