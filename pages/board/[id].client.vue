<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

// Import stores
import { useBoardStore } from "~/stores/board";
import { useItemStore } from "~/stores/itemStore";
import { useNoteStore } from "~/stores/noteStore";
import { useTodoStore } from "~/stores/todoStore";
import { useLinkStore } from "~/stores/linkStore";
import { useTimerStore } from "~/stores/timerStore";
import { useTextWidgetStore } from "~/stores/textWidgetStore";
import { useItemManagement } from "~/composables/useItemManagement";
import { usePanZoom } from "~/composables/usePanZoom";
import { useGlobalShortcuts } from "~/composables/useGlobalShortcuts";
import { useClipboard } from "~/composables/useClipboard";
import { applyOptimalZoom } from "~/utils/boardUtils";
import { getSSEServer } from "~/shared/board";

// Initialize stores
const boardStore = useBoardStore();
const itemStore = useItemStore();
const noteStore = useNoteStore();
const todoStore = useTodoStore();
const linkStore = useLinkStore();
const timerStore = useTimerStore();
const textWidgetStore = useTextWidgetStore();
const tackletStore = useTackletStore();
const { handleDelete, updateItemPosition, toggleLock, updateItemDisplayName } =
    useItemManagement();
// Initialize composables
const route = useRoute();
const {
    scale,
    translateX,
    translateY,
    startPan,
    pan,
    endPan,
    handleZoom,
    updateZoom,
    spacePressed,
    isPanning,
} = usePanZoom();
const { handlePaste } = useClipboard();
const {
    isErrorModalVisible,
    errorTitle,
    errorMessage,
    handleConfirm,
    handleCancel,
} = useErrorHandler();

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
        console.log("Mounted");
    }

    // Ensure the board element has focus to capture keyboard events
    boardRef.value?.focus();
});

let eventSource: EventSource;

onMounted(() => {
    const id = route.params.id as string;
    const server = getSSEServer(id);
    server.pathname = "/sse";
    server.searchParams.set("room", id);
    eventSource = new EventSource(server);

    eventSource.onmessage = (event) => {
        if (event.data === "update") {
            boardStore.initializeBoard(id);
        }
    };
});

onUnmounted(() => {
    eventSource && eventSource.close();
});

// Initialize global shortcuts
useGlobalShortcuts({
    handleDelete,
    handlePaste,
});

function handleDeselect() {
    boardStore.setSelectedId(null);
}
definePageMeta({
    alias: "/",
});

const deleteItemConfirm = ref(false);

const computedDotScale = computed(() => `${scale.value * 3}px`);

const computedDotScaleWidth = computed(() => `${scale.value * 50}px`);

const computedBackgroundImage = computed(
    () =>
        `radial-gradient(circle at ${scale.value * 3}px ${scale.value * 3}px, #D1D5DB ${scale.value * 3}px, transparent ${scale.value * 3}px)`,
);

const computedBackgroundSize = computed(
    () => `${scale.value * 50}px ${scale.value * 50}px`,
);

const computedBackgroundPosition = computed(
    () => `calc(50% + ${translateX.value}px) calc(50% + ${translateY.value}px)`,
);

const { isOpen } = useTackletDirectory();

const { toasts, removeToast } = useToast();

const updateDisplayName = (id: string, displayName: string) => {
    updateItemDisplayName(id, displayName);
    console.log(id, displayName);
};
</script>
<template>
    <div
        ref="boardRef"
        :class="`board fixed inset-0 bg-gray-100 bg-[radial-gradient(circle_at_1px_1px,#D1D5DB_1px,transparent_1px)] bg-[size:24px_24px] overflow-hidden transition-none ease-in-out`"
        :style="{
            '--dot-scale': computedDotScale,
            '--dot-scale-width': computedDotScaleWidth,
            backgroundImage: computedBackgroundImage,
            backgroundSize: computedBackgroundSize,
            backgroundPosition: computedBackgroundPosition,
            touchAction: 'none',
            cursor: spacePressed || isPanning ? 'grab' : 'default',
            userSelect: 'none',
            webkitUserSelect: 'none',
            msUserSelect: 'none',
        }"
        @pointerdown.stop="startPan"
        @pointermove.stop="pan"
        @pointerup.stop="endPan"
        @pointerleave.stop="endPan"
        @wheel.ctrl.prevent="handleZoom"
        @touchstart.stop="
            (e) => {
                startPan(e);
                if (e.target.classList.contains('board')) {
                    handleDeselect();
                }
            }
        "
        @touchmove.stop.prevent="pan"
        @touchend.stop="endPan"
        @touchcancel.stop="endPan"
        @click.stop="handleDeselect"
        tabindex="0"
    >
        <div
            class="board-container absolute origin-center"
            :style="{
                transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                transition: !isPanning ? 'transform 0.3s ease' : 'none',
                width: '20000px',
                height: '20000px',
                left: '-10000px',
                top: '-10000px',
                willChange: 'transform',
            }"
        >
            <div
                class="absolute w-full h-full pointer-events-none"
                :style="{ transform: 'translate(50%, 50%)' }"
            >
                <template v-if="boardStore.board?.data.items">
                    <WidgetWrapper
                        v-for="item in boardStore.board.data.items"
                        :key="item.id"
                        :item-id="item.id"
                        :display-name="item.displayName"
                        :position="{
                            x: item.x_position,
                            y: item.y_position,
                            width: item.width,
                            height: item.height,
                        }"
                        :contrast-color="
                            item.kind === 'image' ? item.contrastColor : false
                        "
                        :kind="item.kind"
                        :is-selected="boardStore.selectedId === item.id"
                        :is-locked="item.lock"
                        @select="boardStore.setSelectedId"
                        @update:position="
                            (updates: Object) =>
                                updateItemPosition(item.id, updates)
                        "
                        :shadow="item.kind !== 'text'"
                        @delete="deleteItemConfirm = true"
                        @lock="(locked: boolean) => toggleLock(item.id, locked)"
                        v-slot="{ startMove }"
                        @update:displayName="
                            (value) => updateDisplayName(item.id, value!)
                        "
                    >
                        <StickyNote
                            v-if="item.kind === 'note'"
                            :item-id="item.id"
                            :initial-text="item.content.text"
                            :initial-color="item.content.color"
                            :is-selected="boardStore.selectedId === item.id"
                            @update:text="
                                (text: string) =>
                                    noteStore.updateNoteContent(item.id, {
                                        text,
                                    })
                            "
                            @update:color="
                                (color: string) =>
                                    noteStore.updateNoteContent(item.id, {
                                        color,
                                    })
                            "
                        />
                        <TodoList
                            v-else-if="item.kind === 'todo'"
                            :list="item"
                            :is-selected="boardStore.selectedId === item.id"
                            @update:title="
                                (title: string) =>
                                    todoStore.updateTodoTitle(item.id, title)
                            "
                            @add:task="
                                (content: string) =>
                                    todoStore.addTask(item.id, content)
                            "
                            @update:task="
                                (taskId: string, content: string) =>
                                    todoStore.updateTask(
                                        item.id,
                                        taskId,
                                        content,
                                    )
                            "
                            @toggle:task="
                                (taskId: string) =>
                                    todoStore.toggleTaskCompletion(
                                        item.id,
                                        taskId,
                                    )
                            "
                            @delete:task="
                                (taskId: string) =>
                                    todoStore.deleteTask(item.id, taskId)
                            "
                        />
                        <LinkItem
                            v-else-if="item.kind === 'link'"
                            :item="item"
                            :is-selected="boardStore.selectedId === item.id"
                        />
                        <Timer
                            v-else-if="item.kind === 'timer'"
                            :is-selected="boardStore.selectedId === item.id"
                            @update:settings="
                                (settings) =>
                                    timerStore.updateTimerSettings(
                                        item.id,
                                        settings,
                                    )
                            "
                        />
                        <TextWidget
                            v-else-if="item.kind === 'text'"
                            :item-id="item.id"
                            :initial-text="item.content.text"
                            :is-selected="boardStore.selectedId === item.id"
                            @update:text="
                                (text: string) =>
                                    textWidgetStore.updateTextWidgetContent(
                                        item.id,
                                        text,
                                    )
                            "
                            @pointerdown.stop.prevent="startMove"
                        />
                        <ImageWidget
                            v-else-if="item.kind === 'image'"
                            :item-id="item.id"
                            :src="item.content.url"
                            :title="item.title"
                            :is-selected="boardStore.selectedId === item.id"
                        />
                        <Tacklet
                            v-else-if="item.kind === 'tacklet'"
                            :item-id="item.id"
                            :is-selected="boardStore.selectedId === item.id"
                            :content="item.content"
                            @update:content="
                                (content) =>
                                    tackletStore.updateTackletContent(
                                        item.id,
                                        content,
                                    )
                            "
                            @widgetInteraction="
                                boardStore.setSelectedId(item.id)
                            "
                        />
                        <AudioWidget
                            v-else-if="item.kind === 'audio'"
                            :item-id="item.id"
                            :title="item.title"
                            :audio-url="item.content.url"
                            :is-selected="boardStore.selectedId === item.id"
                        />
                        <FileWidget
                            v-else-if="item.kind === 'file'"
                            :item-id="item.id"
                            :title="item.title"
                            :file-type="item.content.fileType"
                            :file-size="item.content.fileSize"
                            :file-url="item.content.url"
                            :is-selected="boardStore.selectedId === item.id"
                        />
                    </WidgetWrapper>
                </template>
            </div>
        </div>

        <BoardHeader v-show="!isPanning" />
        <BoardToolbar v-show="!isPanning" />
        <TackletsDirectory
            v-if="isOpen"
            class="tacklet-directory fixed sm:bottom-20 shadow-lg left-1/2 transform -translate-x-1/2 bottom-1/2 translate-y-1/2 sm:translate-y-0 transition-all duration-500"
            @wheel.stop
        />

        <!-- <BoardHeader />

    <BoardToolbar /> -->

        <ProfilePopup v-if="!isPanning" />

        <BoardPasswordDialog />
        <OfflineIndicator />
        <DeleteItemConfirm v-model="deleteItemConfirm" @delete="handleDelete" />
        <ZoomControls class="fixed right-2 bottom-16 z-10" />
        <ErrorModal
            v-model="isErrorModalVisible"
            :title="errorTitle"
            :message="errorMessage"
            @confirm="handleConfirm"
            @cancel="handleCancel"
        />

        <UIToast
            class="fixed top-4 right-4"
            style="z-index: 9999"
            v-for="toast in toasts"
            :key="toast.id"
            v-bind="toast"
            @close="removeToast(toast.id)"
        />
        <BoardCommandPalette />
    </div>
</template>
<style scoped>
html,
body {
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
    transition: scale 0.3s ease;
}

.board,
.board-container {
    touch-action: none; /* This is crucial for removing delay */
    -webkit-touch-callout: none;
}
</style>
