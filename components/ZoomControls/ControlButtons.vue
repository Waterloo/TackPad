<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePanZoom } from '~/composables/usePanZoom';
import { applyOptimalZoom, applyOverviewZoom } from '~/utils/boardUtils';
import { useBoardStore } from '~/stores/board';

const boardStore = useBoardStore();
const { scale, translateX, translateY, updateZoom } = usePanZoom();

// Track if we're in optimal zoom mode
const isOptimalZoom = ref(false);

// Function to handle zoom in
const zoomIn = () => {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  updateZoom(1.2, centerX, centerY);
};

// Function to handle zoom out
const zoomOut = () => {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  updateZoom(0.8, centerX, centerY);
};

// Function to toggle between optimal zoom and overview
const toggleZoomMode = () => {
  isOptimalZoom.value = !isOptimalZoom.value;

  // Make sure we have board items before proceeding
  if (!boardStore.board?.data?.items || boardStore.board.data.items.length === 0) {
    console.warn('No board items available for zoom');
    return;
  }

  // Create a custom updateZoom function that directly sets the scale
  // instead of using it as a multiplier
  const customUpdateZoom = (newScale: number, centerX: number, centerY: number) => {
    // In the original updateZoom, the first parameter is a multiplier
    // But in applyOptimalZoom, it's expecting to pass the absolute scale value
    // So we need to adapt the function to handle this difference

    const zoomPoint = {
      x: (centerX - translateX.value) / scale.value,
      y: (centerY - translateY.value) / scale.value
    };

    scale.value = newScale;
    translateX.value = centerX - zoomPoint.x * newScale;
    translateY.value = centerY - zoomPoint.y * newScale;
  };

  // Create a function to set the translation directly
  const setTranslate = (x: number, y: number) => {
    translateX.value = x;
    translateY.value = y;
  };

  // Apply the appropriate zoom based on the current mode
  if (isOptimalZoom.value) {
    applyOptimalZoom(boardStore.boardItemsArray, customUpdateZoom, setTranslate, boardStore.selectedId);
  } else {
    applyOverviewZoom(boardStore.boardItemsArray, customUpdateZoom, setTranslate);
  }

};

// Button label for zoom mode toggle
const zoomModeLabel = computed(() => {
  return isOptimalZoom.value ? 'Overview' : 'Optimal';
});
</script>

<template>
  <div class="zoom-controls overflow-hidden">
    <div class="p-2 flex flex-col">

        <button
        @click="zoomIn"
        class="w-8 h-8  bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        @click="toggleZoomMode"
        class="w-8 h-8 bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label="Toggle zoom mode"
      >
      <svg v-if="!isOptimalZoom" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><!-- Icon from Remix Icon by Remix Design - https://github.com/Remix-Design/RemixIcon/blob/master/License --><path fill="currentColor" d="M18 7h4v2h-6V3h2zM8 9H2V7h4V3h2zm10 8v4h-2v-6h6v2zM8 15v6H6v-4H2v-2z"/></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><!-- Icon from Remix Icon by Remix Design - https://github.com/Remix-Design/RemixIcon/blob/master/License --><path fill="currentColor" d="M8 3v2H4v4H2V3zM2 21v-6h2v4h4v2zm20 0h-6v-2h4v-4h2zm0-12h-2V5h-4V3h6z"/></svg>
      </button>
      <button
        @click="zoomOut"
        class="w-8 h-8  bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label="Zoom out"
      >−</button>
    </div>
  </div>
</template>
