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

const items = computed(() => {
    if (!boardStore.board?.data.items) return [];
    return itemIds.value
        .map(id => boardStore.board?.data.items.get(id))
        .filter((item): item is BoardItem => !!item);
});


onMounted(async () => {
    await boardStore.initializeBoard(route.params.id as string);
    if (route.params.itemId) {
        itemIds.value.push(route.params.itemId as string);
    }

    window.addEventListener("message", (event) => {
        console.log(event.data);
        if (event.data.type === "append" && event.data.id) {
            if (!itemIds.value.includes(event.data.id)) {
                itemIds.value.push(event.data.id);
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
    <div v-else-if="items.length === 0" class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
        <div class="text-center">
            <h2 class="text-lg font-semibold text-gray-800">Items Not Found</h2>
            <p class="text-gray-600">The requested items could not be found.</p>
        </div>
    </div>
    <div v-else class="flex flex-col gap-4 transition-all duration-300 ease-in-out"
        :class="{ 'p-4': items.length > 1 }">
        <TransitionGroup name="list">
            <div v-for="item in items" :key="item.id"
                class="item-container bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
                <StickyNote v-if="item?.kind === 'note'" :item-id="item.id" :initial-text="item.content.text"
                    :initial-color="item.content.color" :is-selected="boardStore.selectedId === item.id" @update:text="
                        (text: string) => noteStore.updateNoteContent(item.id, { text })
                    " @update:color="
                        (color: string) =>
                            noteStore.updateNoteContent(item.id, { color })
                    " />
                <TodoList v-else-if="item?.kind === 'todo'" :list="item"
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
                <Timer v-else-if="item?.kind === 'timer'" :is-selected="boardStore.selectedId === item.id"
                    @update:settings="
                        (settings) => timerStore.updateTimerSettings(item.id, settings)
                    " />
                <ImageWidget v-else-if="item?.kind === 'image'" :item-id="item.id" :src="item.content.url"
                    :title="item.title" :is-selected="boardStore.selectedId === item.id" />
                <Tacklet v-else-if="item?.kind === 'tacklet'" :item-id="item.id"
                    :is-selected="boardStore.selectedId === item.id" :content="item.content" @update:content="
                        (content) => tackletStore.updateTackletContent(item.id, content)
                    " @widgetInteraction="boardStore.setSelectedId(item.id)" />
            </div>
        </TransitionGroup>
    </div>
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

/* Transition styles */
.list-move,
/* apply transition to moving elements */
.list-enter-active,
.list-leave-active {
    transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.list-leave-active {
    position: absolute;
}
</style>
