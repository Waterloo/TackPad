<script setup lang="ts">
import { useBoardStore } from "~/stores/board";
import { useItemStore } from "~/stores/itemStore";
import { useNoteStore } from "~/stores/noteStore";
import { useTodoStore } from "~/stores/todoStore";
import { useLinkStore } from "~/stores/linkStore";
import { useTimerStore } from "~/stores/timerStore";
import { useTextWidgetStore } from "~/stores/textWidgetStore";
import { useItemManagement } from "~/composables/useItemManagement";
import type { BoardItem } from "~/types/board";

import { VueDraggableNext as Draggable } from 'vue-draggable-next';

definePageMeta({
    layout: "pip-layout",
});
// Initialize stores
const boardStore = useBoardStore();
const itemStore = useItemStore();
const noteStore = useNoteStore();
const todoStore = useTodoStore();
const linkStore = useLinkStore();
const timerStore = useTimerStore();
const textWidgetStore = useTextWidgetStore();
const tackletStore = useTackletStore();
const route = useRoute();
const isLoading = ref(true);

const itemIds = ref<string[]>([]);
const isDragging = ref(false);

const visibleItems = computed({
    get: () => {
        if (!boardStore.board?.data.items) return [];
        return itemIds.value
            .map(id => boardStore.board?.data.items.get(id))
            .filter((item): item is BoardItem => !!item);
    },
    set: (items) => {
        itemIds.value = items.map(i => i.id);
    }
});

const removeItem = (id: string) => {
    itemIds.value = itemIds.value.filter(i => i !== id);
};


onMounted(async () => {
    await boardStore.initializeBoard(route.params.id as string);
    if (route.params.itemId) {
        if (!itemIds.value.includes(route.params.itemId as string)) {
            itemIds.value.push(route.params.itemId as string);
        }
    }

    window.addEventListener("message", async (event) => {
        console.log(event.data);
        if (event.data.type === "append" && event.data.id) {
            if (!itemIds.value.includes(event.data.id)) {
                itemIds.value.push(event.data.id);

                await nextTick();

                const widgetsContainer = document.getElementById("widgets-container");
                widgetsContainer?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }
        }
    });

    isLoading.value = false;
});
</script>
<template>
    <div v-if="isLoading" class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 bg-opacity-50">
        <span class="inline-block w-6 h-6 border-2 border-gray-300 rounded-full border-t-blue-500 animate-spin"></span>
    </div>
    <div v-else-if="visibleItems.length === 0"
        class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
        <div class="text-center">
            <h2 class="text-lg font-semibold text-gray-800">Items Not Found</h2>
            <p class="text-gray-600">The requested items could not be found.</p>
        </div>
    </div>
    <div v-else class="h-full" id="widgets-container">
        <Draggable v-model="visibleItems" class="flex flex-col gap-4 min-h-full transition-all duration-300 ease-in-out"
            handle=".drag-handle" ghost-class="ghost" :animation="200" @start="isDragging = true"
            @end="isDragging = false" :class="{ 'p-4': itemIds.length > 1 }">
            <div v-for="item in visibleItems" :key="item.id">
                <PiPWidgetWrapper :item-id="item.id" @remove="removeItem(item.id)" :interaction-disabled="isDragging">
                    <StickyNote v-if="item.kind === 'note'" :item-id="item.id" :initial-text="item.content.text"
                        :initial-color="item.content.color" :is-selected="boardStore.selectedId === item.id"
                        @update:text="
                            (text: string) => noteStore.updateNoteContent(item.id, { text })
                        " @update:color="
                            (color: string) =>
                                noteStore.updateNoteContent(item.id, { color })
                        " />
                    <TodoList v-else-if="item.kind === 'todo'" :list="item"
                        :is-selected="boardStore.selectedId === item.id" @update:title="
                            (title: string) => todoStore.updateTodoTitle(item.id, title)
                        " @add:task="(content: string) => todoStore.addTask(item.id, content)" @update:task="
                            (taskId: string, content: string) =>
                                todoStore.updateTask(item.id, taskId, content)
                        " @toggle:task="
                            (taskId: string) =>
                                todoStore.toggleTaskCompletion(item.id, taskId)
                        " @delete:task="
                            (taskId: string) => todoStore.deleteTask(item.id, taskId)
                        " />
                    <Timer v-else-if="item.kind === 'timer'" :is-selected="boardStore.selectedId === item.id"
                        @update:settings="
                            (settings) => timerStore.updateTimerSettings(item.id, settings)
                        " />
                    <ImageWidget v-else-if="item.kind === 'image'" :item-id="item.id" :src="item.content.url"
                        :title="item.title" :is-selected="boardStore.selectedId === item.id" />
                    <Tacklet v-else-if="item.kind === 'tacklet'" :item-id="item.id"
                        :is-selected="boardStore.selectedId === item.id" :content="item.content" :containerType="'pip'"
                        @update:content="
                            (content) => tackletStore.updateTackletContent(item.id, content)
                        " @widgetInteraction="boardStore.setSelectedId(item.id)" />
                </PiPWidgetWrapper>
            </div>
        </Draggable>
    </div>
    <BoardCommandPalette />
</template>
<style>
html,
body,
#__nuxt,
.app-container>div {
    height: 100%;
    overflow-y: auto;
    /* Allow scrolling for stacked widgets */
}

/* Ghost class for draggable */
.ghost {
    opacity: 0.5;
    background: #c8ebfb;
}
</style>
