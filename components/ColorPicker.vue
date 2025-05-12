<template>
  <div
    class="flex gap-2 h-full items-center px-2 relative"
    @click.stop
  >
      <button
      v-for="color in colors"
      :key="color"
      class="w-4 h-4 rounded-full border border-gray-200 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
      :style="{ backgroundColor: color }"
      :class="{ 'ring-2 ring-blue-500': modelValue === color && randomNoteColor ==false }"
      :aria-label="`Select ${getColorName(color)} color`"
      :title="getColorName(color)"
      :aria-pressed="modelValue === color"
      @mousedown.stop="() => {
        boardStore.toggleRandomColor(false)
          emit('update:model-value', color);
      }"
    />
    <button
         class="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center text-xs text-gray-700 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
         aria-label="Select random color"
          :class="{ 'ring-2 ring-blue-500': randomNoteColor===true }"
         @mousedown.stop="selectRandomColor"
         title="Pick a Random Color"
       >
         ?
       </button>
  </div>
</template>

<script setup lang="ts">
import {useBoardStore} from '@/stores/board';
const props = defineProps<{
  modelValue: string
}>();

const emit = defineEmits<{
  (e: 'update:model-value', color: string): void
}>();

const colors = [
  '#FFE589', // Yellow
  '#FFB7B7', // Pink
  '#B7E1FF', // Blue
  '#B7FFD8', // Green
  '#E1B7FF', // Purple
  '#FFD700', // Gold
] as const;

const colorNames: Record<string, string> = {
  '#FFE589': 'Yellow',
  '#FFB7B7': 'Pink',
  '#B7E1FF': 'Blue',
  '#B7FFD8': 'Green',
  '#E1B7FF': 'Purple',
  '#FFD700': 'Gold',
};
const boardStore = useBoardStore();
const {randomNoteColor} = storeToRefs(boardStore);

const getColorName = (color: string): string => {
  return colorNames[color] || 'Custom';
};

const selectRandomColor = () => {
  boardStore.toggleRandomColor()
  const randomIndex = Math.floor(Math.random() * colors.length);
  const randomColor = colors[randomIndex];
  emit('update:model-value', randomColor);
};
</script>
