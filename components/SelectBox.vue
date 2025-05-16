<template>
  <div class="border-2 border-blue-300 h-full pointer-events-none">
    <WidgetOptions :itemId="props.itemId">
      <div class="p-3 flex gap-4">
        <!-- Alignment category -->
        <div class="relative group">
          <button class="bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded">
            Align
          </button>
          <!-- Popup appears above the button -->
          <div class="absolute hidden group-hover:block bg-white shadow-lg rounded border border-gray-200 p-2 bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 min-w-[150px]">
            <div class="grid grid-cols-3 gap-2">
              <button
                class="bg-blue-50 hover:bg-blue-100 p-1 rounded"
                @click="handleAlign('left')"
                title="Align Left"
              >
                L
              </button>
              <button
                class="bg-blue-50 hover:bg-blue-100 p-1 rounded"
                @click="handleAlign('center')"
                title="Align Center"
              >
                C
              </button>
              <button
                class="bg-blue-50 hover:bg-blue-100 p-1 rounded"
                @click="handleAlign('right')"
                title="Align Right"
              >
                R
              </button>
              <button
                class="bg-blue-50 hover:bg-blue-100 p-1 rounded"
                @click="handleAlign('top')"
                title="Align Top"
              >
                T
              </button>
              <button
                class="bg-blue-50 hover:bg-blue-100 p-1 rounded"
                @click="handleAlign('middle')"
                title="Align Middle"
              >
                M
              </button>
              <button
                class="bg-blue-50 hover:bg-blue-100 p-1 rounded"
                @click="handleAlign('bottom')"
                title="Align Bottom"
              >
                B
              </button>
            </div>
            <!-- Triangle pointer -->
            <div class="absolute w-3 h-3 bg-white transform rotate-45 left-1/2 -translate-x-1/2 bottom-[-6px] border-r border-b border-gray-200"></div>
          </div>
        </div>

        <!-- Distribution category -->
        <div class="relative group">
          <button class="bg-green-100 hover:bg-green-200 px-3 py-1 rounded">
            Distribute
          </button>
          <div class="absolute hidden group-hover:block bg-white shadow-lg rounded border border-gray-200 p-2 bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 min-w-[100px]">
            <div class="grid grid-cols-2 gap-2">
              <button
                class="bg-green-50 hover:bg-green-100 p-1 rounded"
                @click="handleDistribute('horizontal', false)"
                title="Distribute Horizontally"
              >
                H
              </button>
              <button
                class="bg-green-50 hover:bg-green-100 p-1 rounded"
                @click="handleDistribute('vertical', false)"
                title="Distribute Vertically"
              >
                V
              </button>
            </div>
            <!-- Triangle pointer -->
            <div class="absolute w-3 h-3 bg-white transform rotate-45 left-1/2 -translate-x-1/2 bottom-[-6px] border-r border-b border-gray-200"></div>
          </div>
        </div>

        <!-- Even Distribution category -->
        <div class="relative group">
          <button class="bg-purple-100 hover:bg-purple-200 px-3 py-1 rounded">
            Even
          </button>
          <div class="absolute hidden group-hover:block bg-white shadow-lg rounded border border-gray-200 p-2 bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 min-w-[100px]">
            <div class="grid grid-cols-2 gap-2">
              <button
                class="bg-purple-50 hover:bg-purple-100 p-1 rounded"
                @click="handleDistributeEvenly('horizontal', false)"
                title="Distribute Evenly Horizontally"
              >
                H
              </button>
              <button
                class="bg-purple-50 hover:bg-purple-100 p-1 rounded"
                @click="handleDistributeEvenly('vertical', false)"
                title="Distribute Evenly Vertically"
              >
                V
              </button>
            </div>
            <!-- Triangle pointer -->
            <div class="absolute w-3 h-3 bg-white transform rotate-45 left-1/2 -translate-x-1/2 bottom-[-6px] border-r border-b border-gray-200"></div>
          </div>
        </div>

        <!-- Group Distribution category -->
        <div class="relative group">
          <button class="bg-yellow-100 hover:bg-yellow-200 px-3 py-1 rounded">
            Group
          </button>
          <div class="absolute hidden group-hover:block bg-white shadow-lg rounded border border-gray-200 p-2 bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 min-w-[120px]">
            <div class="grid grid-cols-2 gap-2">
              <button
                class="bg-yellow-50 hover:bg-yellow-100 p-1 rounded"
                @click="handleDistribute('horizontal', true)"
                title="Group & Distribute Horizontally"
              >
                DH
              </button>
              <button
                class="bg-yellow-50 hover:bg-yellow-100 p-1 rounded"
                @click="handleDistribute('vertical', true)"
                title="Group & Distribute Vertically"
              >
                DV
              </button>
              <button
                class="bg-yellow-50 hover:bg-yellow-100 p-1 rounded"
                @click="handleDistributeEvenly('horizontal', true)"
                title="Group & Distribute Evenly Horizontally"
              >
                EH
              </button>
              <button
                class="bg-yellow-50 hover:bg-yellow-100 p-1 rounded"
                @click="handleDistributeEvenly('vertical', true)"
                title="Group & Distribute Evenly Vertically"
              >
                EV
              </button>
            </div>
            <!-- Triangle pointer -->
            <div class="absolute w-3 h-3 bg-white transform rotate-45 left-1/2 -translate-x-1/2 bottom-[-6px] border-r border-b border-gray-200"></div>
          </div>
        </div>
      </div>
    </WidgetOptions>
  </div>
</template>

<script setup lang="ts">
import { update } from 'lodash';
import { useItemStore } from '~/stores/itemStore';

const props = defineProps(["mode", "itemId"]);
const emit = defineEmits(['updateItems']);
const itemStore = useItemStore()
// Alignment handler
const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
  const items = itemStore.getSelectedItems()
  if (items?.length > 0) {

    const updatedItems = alignItems(items,alignment)
    if(updatedItems?.length>0){
      itemStore.updateItemsPosition(updatedItems)
    }
  }

};

// Distribution handler
const handleDistribute = (direction: 'horizontal' | 'vertical', sortByKind: boolean) => {
  const items = itemStore.getSelectedItems()
   if (items?.length > 0) {

     const updatedItems = distributeItems(items,direction,sortByKind)
     if(updatedItems?.length>0){
       itemStore.updateItemsPosition(updatedItems)
     }
   }
};

// Even distribution handler
const handleDistributeEvenly = (direction: 'horizontal' | 'vertical', sortByKind: boolean) => {
  const items = itemStore.getSelectedItems()
   if (items?.length > 0) {

     const updatedItems = distributeEvenlyItems(items,direction,sortByKind)
     if(updatedItems?.length>0){
       itemStore.updateItemsPosition(updatedItems)
     }
   }
};
</script>

<style scoped>
button {
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
}
</style>
