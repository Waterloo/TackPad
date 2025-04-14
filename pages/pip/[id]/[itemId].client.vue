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
const item = ref<BoardItem>();
onMounted(async () => {
    await boardStore.initializeBoard(route.params.id as string);
    item.value = boardStore?.board?.data.items.find(
        (item) => item.id === route.params.itemId,
    );
    isLoading.value = false;
});
</script>
<template>
    <div
        v-if="isLoading"
        class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 bg-opacity-50"
    >
        <span
            class="inline-block w-6 h-6 border-2 border-gray-300 rounded-full border-t-blue-500 animate-spin"
        ></span>
    </div>
    <template v-else>
        <StickyNote
            v-if="item.kind === 'note'"
            :item-id="item.id"
            :initial-text="item.content.text"
            :initial-color="item.content.color"
            :is-selected="boardStore.selectedId === item.id"
            @update:text="
                (text: string) => noteStore.updateNoteContent(item.id, { text })
            "
            @update:color="
                (color: string) =>
                    noteStore.updateNoteContent(item.id, { color })
            "
        />
        <TodoList
            v-else-if="item.kind === 'todo'"
            :list="item"
            :is-selected="boardStore.selectedId === item.id"
            @update:title="
                (title: string) => todoStore.updateTodoTitle(item.id, title)
            "
            @add:task="(content: string) => todoStore.addTask(item.id, content)"
            @update:task="
                (taskId: string, content: string) =>
                    todoStore.updateTask(item.id, taskId, content)
            "
            @toggle:task="
                (taskId: string) =>
                    todoStore.toggleTaskCompletion(item.id, taskId)
            "
            @delete:task="
                (taskId: string) => todoStore.deleteTask(item.id, taskId)
            "
        />
        <Timer
            v-else-if="item.kind === 'timer'"
            :is-selected="boardStore.selectedId === item.id"
            @update:settings="
                (settings) => timerStore.updateTimerSettings(item.id, settings)
            "
        />
        <ImageWidget
            v-else-if="item.kind === 'image'"
            :item-id="item.id"
            :src="item.content.url"
            :title="item.title"
            :is-selected="boardStore.selectedId === item.id"
        />
        <Timer
            v-else-if="item.kind === 'timer'"
            :is-selected="boardStore.selectedId === item.id"
            @update:settings="
                (settings) => timerStore.updateTimerSettings(item.id, settings)
            "
        />
        <Tacklet
            v-else-if="item.kind === 'tacklet'"
            :item-id="item.id"
            :is-selected="boardStore.selectedId === item.id"
            :content="item.content"
            @update:content="
                (content) => tackletStore.updateTackletContent(item.id, content)
            "
            @widgetInteraction="boardStore.setSelectedId(item.id)"
        />
    </template>
</template>
<style>
html,
body,
#__nuxt,
.app-container > div {
    height: 100%;
}
</style>
