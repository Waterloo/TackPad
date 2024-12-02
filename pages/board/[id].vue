<template>
  <div
    ref="boardRef"
    class="fixed inset-0 bg-gray-100 bg-[radial-gradient(circle_at_1px_1px,#D1D5DB_1px,transparent_1px)] bg-[size:24px_24px] overflow-hidden"
    :style="{ touchAction: 'none' }"
    @mousedown.stop="startPan"
    @touchstart.stop.prevent="startPan"
    @touchmove.prevent.stop="pan"
    @touchend.stop.prevent="endPan"
    @touchcancel.stop.prevent="endPan"
    @wheel.prevent="pan"
    @mousemove.prevent="pan"
    @mouseup="endPan"
    @mouseleave="endPan"
    @wheel.ctrl.prevent="handleZoom"
    @keydown.delete="handleDelete"
    @click="boardStore.setSelectedId(null)"
    @paste="handlePaste"
    @keydown.meta.v="handlePaste"
    @keydown.ctrl.v="handlePaste"
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
        willChange: 'transform'
      }"
    >
      <div class="relative w-full h-full" :style="{ transform: 'translate(50%, 50%)' }" >
        <template v-if="boardStore.board?.data.items">
          <BoardItemWrapper
            v-for="item in boardStore.board.data.items"
            :key="item.id"
            :item-id="item.id"
            :position="{
              x: item.x_position,
              y: item.y_position,
              width: item.width,
              height: item.height
            }"
            :is-selected="boardStore.selectedId === item.id"
            @select="boardStore.setSelectedId"
            @update:position="(updates) => updateItemPosition(item.id, updates)"
            :shadow="item.kind === 'text'"
          >
            <StickyNote 
              v-if="item.kind === 'note'" 
              :item-id="item.id"
              :initial-text="item.content.text"
              :initial-color="item.content.color"
              :is-selected="boardStore.selectedId === item.id"
            />
            <TodoList 
              v-else-if="item.kind === 'todo'" 
              :list="item"
              :is-selected="boardStore.selectedId === item.id"
            />
            <LinkItem 
              v-else-if="item.kind === 'link'" 
              :item="item"
              :is-selected="boardStore.selectedId === item.id"
            />
            <Timer
              v-else-if="item.kind === 'timer'"
              :is-selected="boardStore.selectedId === item.id"
            />
            <TextWidget
              v-else-if="item.kind === 'text'"
              :item-id="item.id"
              :initial-text="item.content.text"
              :is-selected="boardStore.selectedId === item.id"
              @update:text="(text) => boardStore.updateItem(item.id, { content: { text } })"
            />
          </BoardItemWrapper>
        </template>

      </div>
    </div>

    <!-- Fixed Controls -->
    <div class="fixed bottom-4 right-4 flex gap-2 items-center">
      <button class="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50" @click.stop="addTimer">
        Add Timer
      </button>
      <button class="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50" @click.stop="addNote">
        Add Note
      </button>
      <button class="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50" @click.stop="addTodoList">
        Add Todo List
      </button>
      <button class="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50" @click.stop="addTextWidget">
        Add Text Widget
      </button>
      <button class="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50" @click="showPasswordDialog">🔒</button>
    </div>
    <dialog class="p-4 w-80 md:w-96" ref="passwordRef">
      <button @click="closePasswordDialog" class="absolute top-2 right-2 text-2xl text-gray-500 hover:text-gray-700">
        &times;
      </button>
      <p class="text-lg font-medium mb-4">Enter Password</p>
      <div class="relative w-full">
        <input type="password" v-model="boardStore.password"
          class="w-full border-2 border-green-400 rounded-md p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Password" />
        <span class="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500">
          🔒
        </span>
      </div>
      <div class="text-sm mt-2">
        Your data is encrypted and decrypted on your device, ensuring privacy and security. Please remember your
        password,
        as it cannot be recovered.
      </div>
      <button @click="closePasswordDialog"
        class="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600">
        Continue
      </button>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid'
import BoardItemWrapper from '~/components/BoardItemWrapper.vue'
import StickyNote from '~/components/StickyNote.vue'
import TodoList from '~/components/TodoList.vue'
import LinkItem from '~/components/LinkItem.vue'
import Timer from '~/components/Timer.vue'
import TextWidget from '~/components/TextWidget.vue'
import { usePanZoom } from '~/composables/usePanZoom';
import { useBoardStore } from '~/stores/board';

definePageMeta({
  alias: '/'
})

const route = useRoute();
const boardStore = useBoardStore();

// Initialize board
onMounted(async () => {
  const boardId = route.params.id as string;
  await boardStore.initializeBoard(boardId);
  // Clear selection on mount
  boardStore.setSelectedId(null);
});

// Pan and zoom functionality
const { scale, translateX, translateY, startPan, pan, endPan, handleZoom, isPanning } = usePanZoom();

// Update board store scale when zooming
watch(scale, (newScale) => {
  boardStore.setScale(newScale);
});

// Add new items
const addNote = () => {
  const position = {
    x: -translateX.value / scale.value + window.innerWidth / (2 * scale.value),
    y: -translateY.value / scale.value + window.innerHeight / (2 * scale.value),
    color: '#FFD700',
    width: 300,
    height: 300,
  };
  boardStore.addNote('', position);
};

const addTodoList = () => {
  const position = {
    x: -translateX.value / scale.value + window.innerWidth / (2 * scale.value),
    y: -translateY.value / scale.value + window.innerHeight / (2 * scale.value),
    width: 350,
    height: 350,
  };
  boardStore.addTodoList(position);
};

const addTimer = () => {
  if (!boardStore.board) return
  
  const position = {
    x: -translateX.value / scale.value,
    y: -translateY.value / scale.value
  }
  
  boardStore.addTimer(position)
}

const addTextWidget = () => {
  const position = {
    x: -translateX.value / scale.value + window.innerWidth / (2 * scale.value),
    y: -translateY.value / scale.value + window.innerHeight / (2 * scale.value),
    width: 200,
    height: 64,
  };
  boardStore.addTextWidget(position);
}

const handleDelete = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }
  boardStore.deleteSelected();
};

const handlePaste = async (e: ClipboardEvent) => {
  // Don't handle paste if we're in an input or textarea
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }

  // Prevent default paste behavior
  e.preventDefault();

  console.log("pasted");
  console.log(e);

  // Safely handle clipboard data: check if clipboardData exists and fallback to navigator.clipboard.read() if necessary
  const clipboardItems = e.clipboardData?.items || await navigator.clipboard.read();

  // If clipboardItems is empty, do nothing
  if (!clipboardItems || clipboardItems.length === 0) return;

  console.log({ clipboardItems });

  // Calculate paste position based on current view
  const position = {
    x: -translateX.value / scale.value + window.innerWidth / (2 * scale.value),
    y: -translateY.value / scale.value + window.innerHeight / (2 * scale.value),
    width: 300,
    height: 400,
  };

  // Handle different types of clipboard content
  for (const item of clipboardItems) {
    if (item instanceof ClipboardItem) {
      if (item.types.includes('text/plain')) {
        const textBlob = await item.getType('text/plain');
        const text = await textBlob.text();

        // If text looks like a TODO list (lines starting with [ ], [x], or - )
        const isTodoList = text.split('\n').some(line =>
          line.trim().match(/^\[( |x?)?\]|\s*-\s+/)
        );

        if (isTodoList) {
          // Create a todo list
          const todos = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => ({
              text: line.replace(/^\[( |x?)?\]|\s*-\s+/, '').trim(),
              completed: line.includes('[x]')
            }));

          position.height = todos.length * 40 + 160; // height of each todo item + minimum height  
          const pastedToDoList = await boardStore.addTodoList({
            ...position
          });

          const id = pastedToDoList!.id;
          todos.forEach(content => boardStore.addTask(id, content.text))

        } else {

          let link = "";
          try {
            link = new URL(text).toString()
          } catch (e) { }

          if (link) {
            boardStore.addLinkItem(link, position)
          }
          // Create a regular note
          else {
            boardStore.addNote(text, {
              ...position,
              color: '#FFD700'
            });
          }
        }
      }

      if (item.types.some(type => type.startsWith('image/'))) {
        // For future image support
        console.log('Image paste support coming soon');
      }
    }
  }
};

const { closePasswordDialog, passwordRef, showPasswordDialog } = usePasswordModal()

function updateItemPosition(itemId: string, updates: { x?: number, y?: number, width?: number, height?: number }) {
  boardStore.updateItem(itemId, {
    x_position: updates.x,
    y_position: updates.y,
    width: updates.width,
    height: updates.height
  })
}
</script>

<style>
.board-container {
  will-change: transform;
}
</style>