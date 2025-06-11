
<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { computed } from 'vue';

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

const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

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
  <Dialog
    v-model:visible="isVisible"
    :header="title"
    :modal="true"
    :closable="false"
    :close-on-escape="false"
    :style="{ width: '25rem' }"
    :breakpoints="{ '575px': '90vw' }"
  >
    <div class="py-2">
      <p class="text-gray-600">{{ message }}</p>
    </div>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <Button
          label="Cancel"
          severity="secondary"
          variant="outlined"
          @click="onCancel"
        />
        <Button
          label="OK"
          @click="onConfirm"
        />
      </div>
    </template>
  </Dialog>
</template>
