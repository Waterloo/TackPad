<template>
    <div class="app-container">
        <div class="app-header">
            <button class="menu-button" @click="toggleSidebar">
                <span class="menu-icon">≡</span>
            </button>
            <div class="title-container">
                <h1
                    v-if="!editTitle"
                    class="board-title"
                    @pointerdown="startEditingTitle"
                    @keypress.enter="startEditingTitle"
                    tabindex="1"
                >
                    {{ boardStore.board?.data.title || "New TackPad" }}
                </h1>

                <input
                    v-else
                    class="title-input"
                    autofocus
                    :value="boardStore.board?.data.title || 'New TackPad'"
                    @keyup.enter="saveTitle(boardStore.board?.data.title)"
                    @blur="(e) => saveTitle(e.target.value)"
                />
                <button
                    v-if="editTitle"
                    @click="saveTitle"
                    class="save-title-button"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                    >
                        <path
                            fill="currentColor"
                            d="m10 15.17l9.192-9.191l1.414 1.414L10 17.999l-6.364-6.364l1.414-1.414z"
                        />
                    </svg>
                </button>
            </div>
            <div class="header-controls">
                <button
                    class="split-screen-toggle"
                    @click="toggleSplitScreen"
                    :class="{ active: splitScreen }"
                >
                    <span class="split-icon">⊞</span>
                </button>
                <button class="menu-button" @click="$emit('toggleCompactMode')">
                    <span class="menu-icon">❌</span>
                </button>
            </div>
        </div>

        <!-- Sidebar -->
        <div
            class="sidebar fixed"
            :class="{
                collapsed: isSidebarCollapsed,
            }"
        >
            <div
                class="sidebar-header"
                v-if="!isSidebarCollapsed && splitScreen"
            >
                <div class="screen-selector">
                    Select for screen {{ selectedSplitScreen }}
                </div>
            </div>

            <!-- Filter dropdown -->
            <div class="filter-container" v-if="!isSidebarCollapsed">
                <select class="kind-filter" v-model="activeKindFilter">
                    <option value="all">All items</option>
                    <option value="todo">Todo</option>
                    <option value="note">Notes</option>
                    <option value="image">Images</option>
                    <option value="file">Files</option>
                    <option value="timer">Timers</option>
                    <option value="audio">Audio</option>
                    <option value="tacklet">Tacklets</option>
                    <option value="link">Links</option>
                </select>
            </div>

            <div class="sidebar-items" v-if="!isSidebarCollapsed">
                <div
                    v-for="item in filteredItems"
                    :key="item.id"
                    class="sidebar-item"
                    :class="{
                        'active-screen-1': selectedItemIds[0] === item.id,
                        'active-screen-2': selectedItemIds[1] === item.id,
                    }"
                    @click="selectItem(item.id)"
                >
                    <div class="item-icon">
                        <span v-if="item.kind === 'todo'">☑</span>
                        <span v-else-if="item.kind === 'note'">
                            <div
                                class="note-icon"
                                :style="{ backgroundColor: item.content.color }"
                            ></div>
                        </span>
                        <span v-else-if="item.kind === 'image'">🖼️</span>
                        <span v-else-if="item.kind === 'file'">📁</span>
                        <span v-else-if="item.kind === 'timer'">⏱️</span>
                        <span v-else-if="item.kind === 'audio'">🎧</span>
                        <span v-else-if="item.kind === 'tacklet'">🧩</span>
                        <span v-else-if="item.kind === 'link'">
                            <div class="link-icon">
                                🌐 {{ item.content.title.charAt(0) }}
                            </div>
                        </span>
                    </div>
                    <div class="item-details">
                        <div class="item-title">
                            {{ getItemTitle(item) }}
                        </div>
                        <div class="item-subtitle" v-if="getItemSubtitle(item)">
                            {{ getItemSubtitle(item) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="main-content" @click="closeSidebarIfOpen">
            <div class="screens-container">
                <div
                    class="screen screen-1"
                    :class="{
                        'full-width': !splitScreen,
                    }"
                    @click="setActiveScreen(1)"
                >
                    <div
                        class="screen-indicator"
                        v-if="splitScreen && selectedItemIds[0]"
                    >
                        Screen 1: {{ getSelectedItemTitle(0) }}
                    </div>
                    <div
                        :class="
                            selectedSplitScreen === 1
                                ? 'border-2 border-blue-300'
                                : ''
                        "
                    >
                        <slot name="screen1" :item="selectedItems.first" />
                    </div>
                </div>
                <div
                    v-if="splitScreen"
                    class="screen screen-2"
                    @click="setActiveScreen(2)"
                >
                    <div class="screen-indicator" v-if="selectedItemIds[1]">
                        Screen 2: {{ getSelectedItemTitle(1) }}
                    </div>
                    <div
                        :class="
                            selectedSplitScreen === 2
                                ? 'border-2 border-blue-300'
                                : ''
                        "
                    ></div>
                    <slot name="screen2" :item="selectedItems.second" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useBoardStore } from "@/stores/board";

const boardStore = useBoardStore();
const {
    editTitle,
    isBoardListOpen,
    startEditingTitle,
    saveTitle,
    toggleBoardList,
} = useBoard();

const props = defineProps({
    itemsList: {
        type: Array,
        required: true,
    },
    initialSplitScreen: {
        type: Boolean,
        default: false,
    },
    selectedItemIds: {
        type: Array,
        default: () => [null, null],
    },
});
const router = useRouter();
const emit = defineEmits([
    "updateSelection",
    "splitScreenChanged",
    "toggleCompactMode",
]);

// State
const items = ref([]);

const isSidebarCollapsed = ref(true);
const selectedSplitScreen = ref(1);
const splitScreen = ref(props.initialSplitScreen);
const activeKindFilter = ref("all");

// Computed for filtered items
const filteredItems = computed(() => {
    if (activeKindFilter.value === "all") {
        return items.value;
    }
    return items.value.filter((item) => item.kind === activeKindFilter.value);
});

// Set items and initialize selections
watch(
    () => props.itemsList,
    (newItems) => {
        items.value = newItems.slice();

        // Select first item by default for screen 1 if there's no selection
        if (items.value.length > 0 && !props.selectedItemIds[0]) {
            emit("updateSelection", [items.value[0].id]);
            router.push({
                query: {
                    compact: true,
                    compactSelectedItem: props.selectedItemIds[0],
                },
            });

            // If split screen is active, select second item for screen 2
            if (
                splitScreen.value &&
                items.value.length > 1 &&
                !props.selectedItemIds[1]
            ) {
                emit("updateSelection", [items.value[1].id]);
            }
        }
    },
    { immediate: true },
);

// Computed properties
const selectedItems = computed(() => {
    return {
        first:
            items.value.find((item) => item.id === props.selectedItemIds[0]) ||
            null,
        second:
            items.value.find((item) => item.id === props.selectedItemIds[1]) ||
            null,
    };
});

// Methods
const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const closeSidebar = () => {
    isSidebarCollapsed.value = true;
};

const closeSidebarIfOpen = () => {
    if (!isSidebarCollapsed.value) {
        isSidebarCollapsed.value = true;
    }
};

const toggleSplitScreen = () => {
    splitScreen.value = !splitScreen.value;
    emit("splitScreenChanged", splitScreen.value);

    // If turning on split screen and second screen doesn't have a selection,
    // select the next available item (if any)
    if (
        splitScreen.value &&
        !props.selectedItemIds[1] &&
        items.value.length > 1
    ) {
        // Find an item that's not already selected for screen 1
        const availableItems = items.value.filter(
            (item) => item.id !== props.selectedItemIds[0],
        );
        if (availableItems.length > 0) {
            emit("updateSelection", [
                props.selectedItemIds[0],
                availableItems[0].id,
            ]);
        }
    }
};

const setActiveScreen = (screenNumber) => {
    selectedSplitScreen.value = screenNumber;
};

const selectItem = (id) => {
    // If we're in split screen mode, assign to the active screen
    if (splitScreen.value) {
        if (props.selectedItemIds.length > 1) {
            if (selectedSplitScreen.value === 1) {
                emit("updateSelection", [id, props.selectedItemIds[1]]);
            } else if (selectedSplitScreen.value === 2) {
                emit("updateSelection", [props.selectedItemIds[0], id]);
            }
        } else {
            if (selectedSplitScreen.value === 1) {
                emit("updateSelection", [id, null]);
            } else if (selectedSplitScreen.value === 2) {
                emit("updateSelection", [props.selectedItemIds[0], id]);
            }
        }
    } else {
        // In single screen mode, always assign to screen 1
        emit("updateSelection", [id, null]);
    }
    router.push({
        query: {
            compact: true,
            compactSelectedItem: id, // Use the newly selected ID
        },
    });
    closeSidebar();
};

const getItemTitle = (item) => {
    switch (item.kind) {
        case "todo":
            return item.content.title;
        case "note":
            return `${item.id}`;
        case "image":
            return `${item.id}`;
        case "file":
            return item.title;
        case "timer":
            return item.content.timerType;
        case "link":
            return item.content.title;
        case "tacklet":
            return item.content.tackletId;
        default:
            return item.id;
    }
};

const getSelectedItemTitle = (index) => {
    const itemId = props.selectedItemIds[index];
    const item = items.value.find((i) => i.id === itemId);
    return item ? getItemTitle(item) : "Nothing selected";
};

const getItemSubtitle = (item) => {
    switch (item.kind) {
        case "todo":
            return `${item.content.tasks.length} tasks`;
        case "timer":
            return `${item.content.duration} min`;
        case "link":
            return "";
        default:
            return "";
    }
};
</script>

<style>
:root {
    --sidebar-width: 250px;
    --sidebar-collapsed-width: 60px;
    --primary-color: #3b82f6;
    --secondary-color: #10b981;
    --highlight-color: #f0f0f0;
    --border-color: #e0e0e0;
    --text-color: #333;
    --text-muted: #666;
    --bg-color: #f8f8f8;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    --transition-speed: 0.3s;
    --border-radius: 8px;
    --screen-gap: 12px;
    --header-height: 60px;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
        Cantarell, sans-serif;
    color: var(--text-color);
    overflow: hidden;
    position: relative;
}

/* Header Styles */
.app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 12px;
    z-index: 50;
    background-color: white;
    height: var(--header-height);
    border-bottom: 1px solid var(--border-color);
}

.title-container {
    display: flex;
    align-items: center;
}

.board-title {
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    max-width: 150px;
    cursor: pointer;
}

@media (min-width: 768px) {
    .board-title {
        max-width: 100%;
    }
}

.title-input {
    position: relative;
    padding: 4px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
}

.save-title-button {
    display: block;
    background: none;
    border: none;
    cursor: pointer;
}

@media (min-width: 768px) {
    .save-title-button {
        display: none;
    }
}

.header-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
}

.menu-button {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 24px;
    padding: 6px 10px;
    border-radius: var(--border-radius);
}

.menu-button:hover {
    background-color: var(--highlight-color);
}

/* Sidebar Styles */
.sidebar {
    position: fixed;
    top: var(--header-height);
    left: 0;
    height: 100%;
    background-color: var(--bg-color);
    border-right: 1px solid var(--border-color);
    transition: transform var(--transition-speed) ease;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    z-index: 10;
}

.sidebar.collapsed {
    transform: translateX(
        calc(-1 * var(--sidebar-width) + var(--sidebar-collapsed-width))
    );
}

.sidebar-header {
    padding: 10px;
    border-bottom: 1px solid var(--border-color);
}

.screen-selector {
    font-size: 14px;
    font-weight: bold;
}

.filter-container {
    padding: 10px;
    border-bottom: 1px solid var(--border-color);
}

.kind-filter {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    background-color: white;
}

.sidebar-items {
    padding: 10px;
    overflow-y: auto;
    flex: 1;
}

.sidebar-item {
    display: flex;
    align-items: center;
    padding: 12px;
    margin: 8px 0;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background-color var(--transition-speed);
    background-color: white;
    box-shadow: var(--shadow);
}

.sidebar-item:hover {
    background-color: var(--highlight-color);
}

.active-screen-1 {
    border-left: 3px solid var(--primary-color);
}

.active-screen-2 {
    border-left: 3px solid var(--secondary-color);
}

.sidebar-item.active-screen-1.active-screen-2 {
    border-left: 3px solid #8b5cf6; /* purple for items selected in both screens */
}

.item-icon {
    width: 30px;
    height: 30px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
}

.note-icon {
    width: 20px;
    height: 20px;
    border-radius: 2px;
}

.link-icon {
    width: 28px;
    height: 28px;
    background-color: #1e63e9;
    color: white;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
}

.item-details {
    flex: 1;
    min-width: 0; /* Prevents text from causing overflow */
}

.item-title {
    font-weight: 500;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-subtitle {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Main Content Styles */
.main-content {
    flex: 1;
    /* margin-top: var(--header-height); */
    overflow: hidden;
    position: relative;
    height: calc(100vh - var(--header-height));
}

.screens-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

@media (min-width: 768px) {
    .screens-container {
        flex-direction: row;
    }

    .sidebar:not(.collapsed) + .main-content {
        margin-left: var(--sidebar-width);
        width: calc(100% - var(--sidebar-width));
    }
}

.screen {
    position: relative;
    overflow-y: auto;
    transition: all var(--transition-speed);
}

/* Mobile layout (vertical split) */
.screen-1,
.screen-2 {
    height: 50%;
    width: 100%;
    max-height: calc(
        50vh - (var(--header-height) / 2) - (var(--screen-gap) / 2)
    );
    padding: 8px;
}

.screen-1 {
    border-bottom: var(--screen-gap) solid transparent;
}

/* Desktop layout (horizontal split) */
@media (min-width: 768px) {
    .screen-1,
    .screen-2 {
        height: 100%;
        width: 50%;
        max-height: calc(100vh - var(--header-height));
        max-width: calc(50% - (var(--screen-gap) / 2));
    }

    .screen-1 {
        border-bottom: none;
        border-right: var(--screen-gap) solid transparent;
    }

    .screen.full-width {
        width: 100%;
        max-width: 100%;
        border-right: none;
    }
}

.screen.active {
    border: 2px solid var(--primary-color);
}

.screen-indicator {
    position: absolute;
    top: 4px;
    left: 8px;
    color: gray;
    font-size: 12px;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 2px 6px;
    border-radius: 4px;
    z-index: 5;
}

.split-screen-toggle {
    height: 32px;
    width: 32px;
    padding: 4px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    transition: background-color var(--transition-speed);
}

.split-screen-toggle:hover {
    background-color: var(--highlight-color);
}

.split-screen-toggle.active {
    background-color: var(--primary-color);
    color: white;
}

.split-icon {
    font-size: 18px;
}

/* No selection placeholder */
.no-selection {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
    font-size: 18px;
    padding: 20px;
}
</style>
