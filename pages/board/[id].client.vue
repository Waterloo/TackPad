<template>
  <div
    ref="boardRef"
    class="board fixed inset-0 bg-gray-100 bg-[radial-gradient(circle_at_1px_1px,#D1D5DB_1px,transparent_1px)] bg-[size:24px_24px] overflow-hidden"
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
        willChange: 'transform',
      }"
    >
      <div
        class="relative w-full h-full"
        :style="{ transform: 'translate(50%, 50%)' }"
      >
        <template v-if="boardStore.board?.data.items">
          <BoardItemWrapper
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
              @update:text="
                (text) => boardStore.updateItem(item.id, { content: { text } })
              "
            />
          </BoardItemWrapper>
        </template>
      </div>
    </div>

    <div
      class="fixed px-4 py-2 top-4 left-4 rounded-lg shadow-lg bg-white divide-y"
    >
      <div class="min-w-52 py-2 z-50 flex items-center gap-2">
        <img
          @pointerdown="isBoardListOpen = !isBoardListOpen"
          @keypress.enter="isBoardListOpen = !isBoardListOpen"
          :src="'/icons/Arrow-Bottom.svg'"
          class="h-5 w-5 sm:h-6 sm:w-6 transition-all duration-200 cursor-pointer"
          :class="{ 'rotate-180': isBoardListOpen }"
          alt="Board Icon"
          tabindex="0"
        />
        <h1
        v-if="!editTitle"
        class="text-base"
          @pointerdown="editTitle = true"
          @keypress.enter="editTitle = true"
          tabindex="1"
        >
        {{ boardStore.board?.data.title || 'New TackPad' }}
      </h1>
        <input autofocus :value="boardStore.board?.data.title || 'New TackPad'" v-else @blur="(e) => {boardStore.setBoardTitle(e.target.value); editTitle = false}"/>
        <!-- <img :src="'/icons/Book.svg'" class="h-5 w-5 sm:h-6 sm:w-6" alt="Board Icon"> -->
      </div>
      <div class="items py-2  flex flex-col gap-2" v-if="isBoardListOpen">
        <div class="text-sm cursor-pointer" v-for="board in boardStore.boards" @click="boardStore.initializeBoard(board.board_id)">{{ board.title }}</div>
        <NuxtLink class="text-sm cursor-pointer flex gap-2 text-blue-500" to="/board/create">Create New TackPad +</NuxtLink>
      </div>
    </div>
    <!-- Fixed Controls -->
    <div
      class="[interpolate-size:'allow-keywords'] fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center bg-white rounded-xl shadow-lg px-2 sm:px-4 py-1 sm:py-2 gap-1 sm:gap-6 transition-all duration-1000 z-10"
    >
      <button
        class="flex group p-1.5 sm:p-2 text-gray-600 hover:text-green-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="addTodoList"
        title="Add Todo List"
      >
        <img
          src="/icons/todo.svg"
          class="h-5 w-5 sm:h-6 sm:w-6"
          alt="Todo List"
        />
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Todo
        </div>
      </button>

      <button
        class="flex group p-1.5 sm:p-2 text-gray-600 hover:text-yellow-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="addNote"
        title="Add Note"
      >
        <img src="/icons/notes.svg" class="h-5 w-5 sm:h-6 sm:w-6" alt="Notes" />
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Notes
        </div>
      </button>

      <button
        class="p-1.5 sm:p-2 text-gray-600 hover:text-purple-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="addTextWidget"
        title="Add Text Widget"
      >
        <img
          src="/icons/text.svg"
          class="h-5 w-5 sm:h-6 sm:w-6"
          alt="Text Widget"
        />
      </button>

      <button
        class="group flex p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="addTimer"
        title="Add Timer"
      >
        <img src="/icons/timer.svg" class="h-5 w-5 sm:h-6 sm:w-6" alt="Timer" />
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Timer
        </div>
      </button>

      <a
        @click.prevent
        :href="getBookMarkURL()"
        class="flex group p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
        title="Add Bookmark"
      >
        <img
          src="/icons/bookmark.svg"
          class="h-5 w-5 sm:h-6 sm:w-6 select-none"
          alt="Bookmark"
        />
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Bookmark
        </div>
      </a>
    </div>
    <dialog class="p-4 w-80 md:w-96" ref="passwordRef">
      <button
        @click="closePasswordDialog"
        class="absolute top-2 right-2 text-2xl text-gray-500 hover:text-gray-700"
      >
        &times;
      </button>
      <p class="text-lg font-medium mb-4">Enter Password</p>
      <div class="relative w-full">
        <input
          type="password"

          class="w-full border-2 border-green-400 rounded-md p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Password"
        />
        <span
          class="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500"
        >
          🔒
        </span>
      </div>
      <div class="text-sm mt-2">
        Your data is encrypted and decrypted on your device, ensuring privacy
        and security. Please remember your password, as it cannot be recovered.
      </div>
      <button
        @click="closePasswordDialog"
        class="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600"
      >
        Continue
      </button>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { nanoid } from "nanoid";
import BoardItemWrapper from "~/components/BoardItemWrapper.vue";
import StickyNote from "~/components/StickyNote.vue";
import TodoList from "~/components/TodoList.vue";
import LinkItem from "~/components/LinkItem.vue";
import Timer from "~/components/Timer.vue";
import TextWidget from "~/components/TextWidget.vue";
import { usePanZoom } from "~/composables/usePanZoom";
import { useBoardStore } from "~/stores/board";
import {
  calculateBoardBounds,
  calculateOptimalZoom,
  calculateBoardCenter,
} from "~/shared/board";
import { ref, onMounted, onUnmounted, nextTick } from "vue";

definePageMeta({
  alias: "/",
});

const route = useRoute();
const boardStore = useBoardStore();
const boardRef = ref<HTMLElement | null>(null);
const editTitle = ref(false);
const isBoardListOpen = ref(false);
/**
 * Calculates and applies the optimal zoom level to show all items
 */
function applyOptimalZoom() {
  if (!boardStore.board?.data.items || !boardRef.value) return;

  const bounds = calculateBoardBounds(boardStore.board.data.items);
  const viewport = {
    width: boardRef.value.clientWidth,
    height: boardRef.value.clientHeight,
  };

  // Calculate optimal zoom and center position
  const optimalZoom = calculateOptimalZoom(bounds, viewport);
  const center = calculateBoardCenter(bounds);

  // Set zoom level
  scale.value = optimalZoom;

  // Center the board on the items
  translateX.value = viewport.width / 2 - center.x * optimalZoom;
  translateY.value = viewport.height / 2 - center.y * optimalZoom;

  // Update board store
  boardStore.setScale(optimalZoom);
}

// Initialize board
onMounted(async () => {
  const boardId = route.params.id as string;
  await boardStore.initializeBoard(boardId);
  // Clear selection on mount
  boardStore.setSelectedId(null);

  // Calculate and set optimal zoom level after board is initialized
  nextTick(applyOptimalZoom);
});

// Recalculate zoom when window is resized
onMounted(() => {
  window.addEventListener("resize", applyOptimalZoom);
});

onUnmounted(() => {
  window.removeEventListener("resize", applyOptimalZoom);
});

// Pan and zoom functionality
const {
  scale,
  translateX,
  translateY,
  startPan,
  pan,
  endPan,
  handleZoom,
  isPanning,
} = usePanZoom();

// Update board store scale when zooming
watch(scale, (newScale) => {
  boardStore.setScale(newScale);
});

// Add new items
const addNote = () => {
  const position = {
    x: -translateX.value / scale.value + window.innerWidth / (2 * scale.value),
    y: -translateY.value / scale.value + window.innerHeight / (2 * scale.value),
    color: "#FFD700",
    width: 300,
    height: 300,
  };
  boardStore.addNote("", position);
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
  if (!boardStore.board) return;

  const position = {
    x: -translateX.value / scale.value,
    y: -translateY.value / scale.value,
  };

  boardStore.addTimer(position);
};

const addTextWidget = () => {
  const position = {
    x: -translateX.value / scale.value + window.innerWidth / (2 * scale.value),
    y: -translateY.value / scale.value + window.innerHeight / (2 * scale.value),
    width: 200,
    height: 64,
  };
  boardStore.addTextWidget(position);
};

const handleDelete = (e: KeyboardEvent) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement
  ) {
    return;
  }
  boardStore.deleteSelected();
};

const handlePaste = async (e: ClipboardEvent) => {
  // Don't handle paste if we're in an input or textarea
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  // Prevent default paste behavior
  e.preventDefault();

  console.log("pasted");
  console.log(e);

  // Safely handle clipboard data: check if clipboardData exists and fallback to navigator.clipboard.read() if necessary
  const clipboardItems =
    e.clipboardData?.items || (await navigator.clipboard.read());

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
      if (item.types.includes("text/plain")) {
        const textBlob = await item.getType("text/plain");
        const text = await textBlob.text();

        // If text looks like a TODO list (lines starting with [ ], [x], or - )
        const isTodoList = text
          .split("\n")
          .some((line) => line.trim().match(/^\[( |x?)?\]|\s*-\s+/));

        if (isTodoList) {
          // Create a todo list
          const todos = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => ({
              text: line.replace(/^\[( |x?)?\]|\s*-\s+/, "").trim(),
              completed: line.includes("[x]"),
            }));

          position.height = todos.length * 40 + 160; // height of each todo item + minimum height
          const pastedToDoList = await boardStore.addTodoList({
            ...position,
          });

          const id = pastedToDoList!.id;
          todos.forEach((content) => boardStore.addTask(id, content.text));
        } else {
          let link = "";
          try {
            link = new URL(text).toString();
          } catch (e) {}

          if (link) {
            boardStore.addLinkItem(link, position);
          }
          // Create a regular note
          else {
            boardStore.addNote(text, {
              ...position,
              color: "#FFD700",
            });
          }
        }
      }

      if (item.types.some((type) => type.startsWith("image/"))) {
        // For future image support
        console.log("Image paste support coming soon");
      }
    }
  }
};

const { closePasswordDialog, passwordRef, showPasswordDialog } =
  usePasswordModal();

function updateItemPosition(
  itemId: string,
  updates: { x?: number; y?: number; width?: number; height?: number }
) {
  boardStore.updateItem(itemId, {
    x_position: updates.x,
    y_position: updates.y,
    width: updates.width,
    height: updates.height,
  });
}

function getBookMarkURL() {
  const apiURL = `${useRequestURL().protocol}//${
    useRequestURL().host
  }/api/bookmark/${route.params.id}`;

  const bookmarkletURI = `javascript:(function() {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('custom-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'custom-toast-container';
    toastContainer.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    \`;
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = \`
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 12px 24px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    min-width: 250px;
    animation: slideIn 0.3s ease-in-out;
  \`;

  // Add success icon
  const icon = document.createElement('span');
  icon.innerHTML = '✓';
  icon.style.cssText = \`
    color: #22C55E;
    margin-right: 12px;
    font-size: 20px;
  \`;

  // Add message container
  const messageContainer = document.createElement('div');
  messageContainer.style.cssText = \`
    flex-grow: 1;
  \`;

  // Add title
  const title = document.createElement('div');
  title.textContent = 'Bookmarked';
  title.style.cssText = \`
    font-weight: 600;
    font-size: 16px;
    color: #1a1a1a;
  \`;

  // Add message
  const message = document.createElement('div');
  message.textContent = 'You can access bookmark from the board';
  message.style.cssText = \`
    font-size: 14px;
    color: #666;
    margin-top: 2px;
  \`;

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = \`
    background: none;
    border: none;
    color: #999;
    font-size: 20px;
    cursor: pointer;
    padding: 0 0 0 12px;
  \`;
  closeButton.onclick = () => toast.remove();

  // Add styles for animation
  const style = document.createElement('style');
  style.textContent = \`
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  \`;
  document.head.appendChild(style);

  // Assemble toast
  messageContainer.appendChild(title);
  messageContainer.appendChild(message);
  toast.appendChild(icon);
  toast.appendChild(messageContainer);
  toast.appendChild(closeButton);
  toastContainer.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toastContainer.remove();
    style.remove();
  }, 3000);

  // Execute the original bookmarklet functionality
  fetch('${apiURL}', {
    method: 'POST',
    body: JSON.stringify({link: window.location.href}),
    headers: {'Content-Type': 'application/json'}
  });
})();`;

  return encodeURI(bookmarkletURI);
}
</script>

<style>
.board-container {
  will-change: transform;
  font-family: "Figtree", sans-serif;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
}
</style>
