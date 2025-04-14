<script setup lang="ts">
import { useMagicKeys } from "@vueuse/core";
import { whenever } from "@vueuse/core";
import Modal from "@/components/UI/Modal.vue";

const {
    addNote,
    addTodoList,
    addTimer,
    addTextWidget,
    calculateCenterPosition,
} = useItemManagement();
// UI state
const isOpen = ref(false);
const searchQuery = ref("");
const selectedIndex = ref(0);
const searchInputRef = ref(null);
const commandListRef = ref(null);

// Set up keyboard shortcuts with useMagicKeys
const keys = useMagicKeys({
    passive: false,
    onEventFired(e) {
        if (e.ctrlKey && e.key === "k" && e.type === "keydown")
            e.preventDefault();
    },
});

whenever(keys.alt_s, () => {
    if (!shouldIgnoreKeypress()) {
        addNote();
    }
});

whenever(keys.alt_c, () => {
    if (!shouldIgnoreKeypress()) {
        addTodoList();
    }
});

whenever(keys.alt_b, () => {
    if (!shouldIgnoreKeypress()) {
        addTimer();
    }
});

// Helper to check if we should ignore keypresses
const shouldIgnoreKeypress = () => {
    return (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement?.classList.contains("tiptap")
    );
};

// Command definitions
const commands = [
    {
        id: "new-note",
        name: "New Note",
        shortcut: "Alt+S",
        category: "Create",
        action: () => {
            addNote();
        },
    },
    {
        id: "new-todo",
        name: "New Todo List",
        shortcut: "Alt+C",
        category: "Create",
        action: () => {
            addTodoList();
        },
    },
    {
        id: "new-timer",
        name: "New Timer",
        shortcut: "Alt+B",
        category: "Create",
        action: () => {
            addTimer();
        },
    },
    {
        id: "new-bookmark",
        name: "New Bookmark",
        shortcut: "Alt+L",
        category: "Create",
        action: () => console.log("Creating new bookmark"),
    },
    {
        id: "save-board",
        name: "Save Board",
        shortcut: "Alt+S",
        category: "Board",
        action: () => boardStore.saveBoard(),
    },
    {
        id: "new-board",
        name: "New Board",
        shortcut: "Alt+N",
        category: "Board",
        action: () => {
            window.location.href = "/board/create";
        },
    },
];

// Filter commands based on search query
const filteredCommands = computed(() => {
    return commands.filter(
        (command) =>
            command.name
                .toLowerCase()
                .includes(searchQuery.value.toLowerCase()) ||
            command.category
                .toLowerCase()
                .includes(searchQuery.value.toLowerCase()),
    );
});

// Group commands by category
const groupedCommands = computed(() => {
    return filteredCommands.value.reduce((groups, command) => {
        const category = command.category;
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(command);
        return groups;
    }, {});
});

// Get the index of a command in the filtered list
const getCommandIndex = (command) => {
    return filteredCommands.value.findIndex((c) => c.id === command.id);
};

// Open/close the command palette
const toggleCommandPalette = () => {
    isOpen.value = !isOpen.value;
    searchQuery.value = "";
    selectedIndex.value = 0;
};

// Handle command execution
const executeCommand = (command) => {
    command.action();
    isOpen.value = false;
    searchQuery.value = "";
};

// Handle keyboard navigation
const handleKeyDown = (e) => {
    switch (e.key) {
        case "ArrowDown":
            e.preventDefault();
            selectedIndex.value = Math.min(
                selectedIndex.value + 1,
                filteredCommands.value.length - 1,
            );
            break;
        case "ArrowUp":
            e.preventDefault();
            selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
            break;
        case "Enter":
            e.preventDefault();
            if (filteredCommands.value[selectedIndex.value]) {
                executeCommand(filteredCommands.value[selectedIndex.value]);
            }
            break;
        case "Escape":
            e.preventDefault();
            isOpen.value = false;
            break;
        default:
            break;
    }
};

// Set up additional keyboard shortcuts using useMagicKeys
whenever(keys.escape, () => {
    if (isOpen.value) {
        isOpen.value = false;
    }
});

// Use whenever for the Ctrl+K / Cmd+K shortcut to open command palette
whenever(keys.ctrl_k, (e) => {
    // e?.preventDefault();
    toggleCommandPalette();
});

// Also allow Cmd+K for Mac users
whenever(keys.meta_k, (e) => {
    toggleCommandPalette();
});

// Watch for changes to selectedIndex and scroll into view
watch(selectedIndex, async (newIndex) => {
    if (isOpen.value && commandListRef.value) {
        await nextTick();
        const selectedElement = commandListRef.value.querySelector(
            `[data-index="${newIndex}"]`,
        );
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: "nearest" });
        }
    }
});

// Focus the search input when the palette opens
watch(isOpen, async (newValue) => {
    if (newValue) {
        await nextTick();
        searchInputRef.value?.focus();
    }
});
</script>
<template>
    <div v-if="isOpen">
        <Modal v-model="isOpen">
            <div
                class="fixed flex flex-col w-full max-w-2xl overflow-hidden transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl min-h-80 max-h-80 top-1/2 left-1/2"
                @pointerdown.stop
                @pointerup.stop
                @scroll.stop
                @wheel.stop
            >
                <!-- Search input -->
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-center space-x-3">
                        <img
                            src="/icons/command.svg"
                            alt="Command"
                            class="w-5 h-5 text-gray-400"
                        />
                        <input
                            ref="searchInputRef"
                            type="text"
                            placeholder="Search commands..."
                            class="flex-1 text-gray-700 outline-none"
                            v-model="searchQuery"
                            @keydown="handleKeyDown"
                        />
                        <kbd
                            class="px-2 py-1 text-xs text-gray-500 bg-gray-100 border border-gray-300 rounded"
                        >
                            Esc
                        </kbd>
                    </div>
                </div>

                <!-- Command list -->
                <div
                    class="flex-grow overflow-y-auto max-h-80"
                    ref="commandListRef"
                >
                    <template v-if="Object.keys(groupedCommands).length > 0">
                        <div
                            v-for="(commands, category) in groupedCommands"
                            :key="category"
                        >
                            <div
                                class="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50"
                            >
                                {{ category }}
                            </div>
                            <div>
                                <div
                                    v-for="command in commands"
                                    :key="command.id"
                                    :data-index="getCommandIndex(command)"
                                    class="flex items-center justify-between px-4 py-3 cursor-pointer"
                                    :class="
                                        selectedIndex ===
                                        getCommandIndex(command)
                                            ? 'bg-blue-50'
                                            : 'hover:bg-gray-50'
                                    "
                                    @click="executeCommand(command)"
                                >
                                    <div class="flex items-center space-x-2">
                                        <div
                                            class="flex items-center justify-center w-8 h-8 rounded-md"
                                            :class="
                                                selectedIndex ===
                                                getCommandIndex(command)
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-gray-100 text-gray-600'
                                            "
                                        >
                                            {{ command.name.charAt(0) }}
                                        </div>
                                        <span
                                            :class="
                                                selectedIndex ===
                                                getCommandIndex(command)
                                                    ? 'text-blue-600'
                                                    : 'text-gray-700'
                                            "
                                        >
                                            {{ command.name }}
                                        </span>
                                    </div>
                                    <kbd
                                        class="px-2 py-1 text-xs text-gray-500 bg-gray-100 border border-gray-300 rounded"
                                    >
                                        {{ command.shortcut }}
                                    </kbd>
                                </div>
                            </div>
                        </div>
                    </template>
                    <div v-else class="p-4 text-center text-gray-500">
                        No commands found
                    </div>
                </div>

                <!-- Command palette footer -->
                <div
                    class="flex justify-between p-3 text-xs text-gray-500 border-t border-gray-200 justify-self-end bg-gray-50"
                >
                    <div class="flex space-x-3">
                        <div class="flex items-center space-x-1">
                            <kbd
                                class="px-1.5 py-0.5 bg-white border border-gray-300 rounded"
                                >↑</kbd
                            >
                            <kbd
                                class="px-1.5 py-0.5 bg-white border border-gray-300 rounded"
                                >↓</kbd
                            >
                            <span>Navigate</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <kbd
                                class="px-1.5 py-0.5 bg-white border border-gray-300 rounded"
                                >Enter</kbd
                            >
                            <span>Select</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-1">
                        <kbd
                            class="px-1.5 py-0.5 bg-white border border-gray-300 rounded"
                            >Esc</kbd
                        >
                        <span>Close</span>
                    </div>
                </div>
            </div>
        </Modal>
    </div>
</template>
<style></style>
