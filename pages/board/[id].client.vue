<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import BoardItemWrapper from "~/components/BoardItemWrapper.vue";

// Import stores
import { useBoardStore } from "~/stores/board";
import { useItemStore } from "~/stores/itemStore";
import { useNoteStore } from "~/stores/noteStore";
import { useTodoStore } from "~/stores/todoStore";
import { useLinkStore } from "~/stores/linkStore";
import { useTimerStore } from "~/stores/timerStore";
import { useTextWidgetStore } from "~/stores/textWidgetStore";
import {useItemManagement} from "~/composables/useItemManagement"
import { usePanZoom } from "~/composables/usePanZoom";
import { useGlobalShortcuts } from "~/composables/useGlobalShortcuts";
import { useClipboard } from "~/composables/useClipboard";
import { applyOptimalZoom } from "~/utils/boardUtils";

// Initialize stores
const boardStore = useBoardStore();
const itemStore = useItemStore();
const noteStore = useNoteStore();
const todoStore = useTodoStore();
const linkStore = useLinkStore();
const timerStore = useTimerStore();
const textWidgetStore = useTextWidgetStore();
const { handleDelete, updateItemPosition, toggleLock } = useItemManagement();
// Initialize composables
const route = useRoute();
const { scale, translateX, translateY, startPan, pan, endPan, handleZoom, updateZoom, spacePressed, isPanning } = usePanZoom();
const { handlePaste } = useClipboard();

const boardRef = ref<HTMLElement | null>(null);
// Initialize board
onMounted(async () => {
  await boardStore.initializeBoard(route.params.id as string);
  
  // Apply optimal zoom after board is loaded
  if (boardStore.board?.data.items) {
    // Create a function to set the translation directly
    const setTranslate = (x: number, y: number) => {
      translateX.value = x;
      translateY.value = y;
    };
    
    // Pass the setTranslate function to applyOptimalZoom
    applyOptimalZoom(boardStore.board.data.items, updateZoom, setTranslate);
  }
  
  // Ensure the board element has focus to capture keyboard events
  boardRef.value?.focus();
});

// Initialize global shortcuts
useGlobalShortcuts({
  handleDelete,
  handlePaste
});


function handleDeselect() {
  boardStore.setSelectedId(null);
}
definePageMeta({
  alias: '/'
})

const deleteItemConfirm = ref(false);

</script>
<template>
 <div
    ref="boardRef"
    class="board fixed inset-0 bg-gray-100 bg-[radial-gradient(circle_at_1px_1px,#D1D5DB_1px,transparent_1px)] bg-[size:24px_24px] overflow-hidden"
    :style="{ touchAction: 'none', cursor: spacePressed ? 'grab' : 'default' }"
    @mousedown.stop="startPan"
    @mousemove.stop="pan"
    @mouseup.stop="endPan"
    @mouseleave.stop="endPan"
    @wheel.ctrl.prevent="handleZoom"
    @click.stop="handleDeselect"
    tabindex="0"
  >
    <div
      class="board-container absolute origin-center"
      :style="{
        transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
        width: '20000px',
        height: '20000px',
        left: '-10000px',
        top: '-10000px',
        willChange: 'transform',
      }"
      @touchstart.stop="startPan"
      @touchmove.stop="pan"
      @touchend.stop="endPan"
      @touchcancel.stop="endPan"
    >
      <div
        class="relative w-full h-full"
        :style="{ transform: 'translate(50%, 50%)' }"
      >
        <template v-if="boardStore.board?.data.items">
          <WidgetWrapper
            v-for="item in boardStore.board.data.items"
            :key="item.id"
            :item-id="item.id"
            :position="{
              x: item.x_position,
              y: item.y_position,
              width: item.width,
              height: item.height,
            }"
            :is-selected="boardStore.selectedId === item.id"
            :is-locked="item.lock"
            @select="boardStore.setSelectedId"
            @update:position="(updates:Object) => updateItemPosition(item.id, updates)"
            :shadow="item.kind === 'text'"
            @delete="deleteItemConfirm = true"
            @lock="(locked:boolean) => toggleLock(item.id, locked)"
          >
            <StickyNote
              v-if="item.kind === 'note'"
              :item-id="item.id"
              :initial-text="item.content.text"
              :initial-color="item.content.color"
              :is-selected="boardStore.selectedId === item.id"
              @update:text="(text: string) => noteStore.updateNoteContent(item.id, { text })"
              @update:color="(color: string) => noteStore.updateNoteContent(item.id, { color })"
            />
            <TodoList
              v-else-if="item.kind === 'todo'"
              :list="item"
              :is-selected="boardStore.selectedId === item.id"
              @update:title="(title:string) => todoStore.updateTodoTitle(item.id, title)"
              @add:task="(content:string) => todoStore.addTask(item.id, content)"
              @update:task="(taskId:string, content:string) => todoStore.updateTask(item.id, taskId, content)"
              @toggle:task="(taskId:string) => todoStore.toggleTaskCompletion(item.id, taskId)"
              @delete:task="(taskId:string) => todoStore.deleteTask(item.id, taskId)"
            />
            <LinkItem
              v-else-if="item.kind === 'link'"
              :item="item"
              :is-selected="boardStore.selectedId === item.id"
            />
            <Timer
              v-else-if="item.kind === 'timer'"
              :is-selected="boardStore.selectedId === item.id"
              @update:settings="(settings) => timerStore.updateTimerSettings(item.id, settings)"
            />
            <TextWidget
              v-else-if="item.kind === 'text'"
              :item-id="item.id"
              :initial-text="item.content.text"
              :is-selected="boardStore.selectedId === item.id"
              @update:text="(text:string) => textWidgetStore.updateTextWidgetContent(item.id, text)"
            />
          </WidgetWrapper>
        </template>
      </div>
    </div>

    <BoardHeader />

    <BoardToolbar />
  
      <ProfilePopup />
    <BoardPasswordDialog />
    <OfflineIndicator />
    <DeleteItemConfirm v-model="deleteItemConfirm" @delete="handleDelete" />
  </div>
</template>
<style scoped>
html, body {
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: none;
}

/* Global scrollbar styles */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Firefox scrollbar styles */
* {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.board-container {
  will-change: transform;
}
</style>