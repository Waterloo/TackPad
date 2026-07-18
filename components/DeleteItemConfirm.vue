<template>
    <Dialog
      v-model:visible="isOpen"
      header="Delete Item"
      :modal="true"
      :closable="true"
      :close-on-escape="true"
      :style="{ width: '25rem' }"
      :breakpoints="{ '575px': '90vw' }"
    >
      <div class="space-y-4">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">
          Delete "<span class="text-indigo-600 font-medium">{{ item?.kind }}</span>"
        </h2>
        <p class="text-gray-600 mb-2">
          Are you sure you want to delete this item?
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <Button
            label="Cancel"
            severity="secondary"
            variant="outlined"
            @click="isOpen = false"
          />
          <Button
            label="Delete Item"
            severity="danger"
            @click="()=>{
                $emit('delete')
                isOpen = false
            }"
          />
        </div>
      </template>
    </Dialog>
</template>

<script setup>
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
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
