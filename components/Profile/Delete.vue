
<template>
  <Dialog
    v-model:visible="isOpen"
    header="Delete Board"
    :modal="true"
    :closable="true"
    :close-on-escape="true"
    :style="{ width: '28rem' }"
    :breakpoints="{ '641px': '90vw' }"
  >
    <div class="space-y-4">
      <h2 class="text-xl font-semibold text-gray-800">
        Delete "<span class="text-indigo-600 font-medium">{{ boardTitle }}</span>"
      </h2>
      <p class="text-gray-600">
        Are you sure you want to delete this board?
      </p>
      <Message severity="warn" :closable="false" class="text-sm">
        This action cannot be undone. All content associated with this board will be permanently removed.
      </Message>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <Button
          label="Cancel"
          severity="secondary"
          variant="outlined"
          @click="closeModal"
        />
        <Button
          label="Delete Board"
          severity="danger"
          @click="$emit('delete-board')"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
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
