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
      :class="{ 'ring-2 ring-blue-500': modelValue === color }"
      :aria-label="`Select ${getColorName(color)} color`"
      :aria-pressed="modelValue === color"
      @mousedown.stop="$emit('update:model-value', color)"
    />
  </div>
</template>

<script setup lang="ts">
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

const getColorName = (color: string): string => {
  return colorNames[color] || 'Custom';
};
</script>