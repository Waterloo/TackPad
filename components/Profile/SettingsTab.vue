<script setup lang="ts">
import DeleteBoardModal from "./Delete.vue";
import { useBoardStore } from "~/stores/board";
import Backup from "./Backup.vue";
import BoardSharePopup from "./BoardSharePopup.vue";
import type { BoardAccessLevel } from "@/types/access"; // Make sure this type is defined correctly
import Modal from "@/components/UI/Modal.vue";
const boardStore = useBoardStore();

const isOldBoard = computed(() => boardStore.isOldBoard);
const isOwner = computed(() => boardStore.isOwner);
const currentAccessLevel = computed(() => boardStore.boardAccessLevel);
const loadingAccess = computed(() => boardStore.loadingAccess); // To disable controls while updating
const errorAccess = computed(() => boardStore.errorAccess); // To display errors

// Define the available access levels and their user-friendly labels
// Adjust these based on your actual BoardAccessLevel type and desired labels
const accessLevels: {
    value: BoardAccessLevel; // Use the imported type
    label: string;
    description: string;
}[] = [
    {
        value: "public", // Matches BoardAccessLevel.PUBLIC
        label: "Public",
        description:
            "Anyone with the link can view AND edit. Use with caution.",
    },

    {
        value: "limited_edit", // Matches BoardAccessLevel.LIMITED_EDIT
        label: "Public (Invite Edit)",
        // NOTE: You might want to refine this description based on exactly
        // what 'limited edit' permissions entail in your application.
        description:
            "Anyone with the link can view and perform limited edits (e.g., add items, vote).",
    },

    {
        value: "private_shared", // Matches BoardAccessLevel.PRIVATE_SHARED
        label: "Private (Shared)",
        description:
            "Only explicitly invited users can access. Access levels for invited users can be managed.",
    },
    {
        value: "view_only", // Matches BoardAccessLevel.VIEW_ONLY
        label: "Private(View Only)",
        description: "Anyone with the link can view, but not edit.",
    },
    {
        value: "admin_only", // Matches BoardAccessLevel.ADMIN_ONLY
        label: "Admin Only",
        // NOTE: Clarify based on your logic for 'Admin Only'. Does it include the owner implicitly?
        description:
            "Only board administrators (owner and invited admins) can access.",
    },
];

// Color scheme settings (existing code)
const colorScheme = ref("system"); // 'light', 'dark', or 'system'

// Initialize color scheme from local storage or system preference (existing code)
onMounted(() => {
    // Get saved preference from localStorage
    const savedScheme = localStorage.getItem("color-scheme");
    if (savedScheme) {
        colorScheme.value = savedScheme;
        applyColorScheme(savedScheme);
    } else {
        // Default to system preference
        colorScheme.value = "system";
        const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
        ).matches;
        applyColorScheme(prefersDark ? "dark" : "light");
    }
});

// Watch for changes to color scheme (existing code)
watch(colorScheme, (newValue) => {
    localStorage.setItem("color-scheme", newValue);
    applyColorScheme(newValue);
});

// Apply the color scheme to the document (existing code)
const applyColorScheme = (scheme: string) => {
    const root = document.documentElement;
    if (!root) return; // Guard against potential null root

    if (scheme === "system") {
        const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
        ).matches;
        root.classList.toggle("dark", prefersDark);
    } else {
        root.classList.toggle("dark", scheme === "dark");
    }
};

let deleteOpen = ref(false);
let showSharePopup = ref(false);
async function handleDeleteBoard() {
    await boardStore.deleteBoard();
    deleteOpen.value = false;
}

// Note: useBoard composable likely doesn't exist or is redundant if using the store directly
// const { deleteBoard } = useBoard(); // Replace with store action if necessary

const showAccessConfirmationModal = ref(false);
const pendingAccessLevel = ref<BoardAccessLevel | null>(null);
const removeExistingAccess = ref(false); // Checkbox state

// --- MODIFIED: Handler to show confirmation modal ---
function handleAccessLevelChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newLevel = target.value as BoardAccessLevel;

    if (
        newLevel &&
        newLevel !== currentAccessLevel.value &&
        !loadingAccess.value
    ) {
        pendingAccessLevel.value = newLevel;
        removeExistingAccess.value = false; // Reset checkbox
        showAccessConfirmationModal.value = true;

        // IMPORTANT: Reset the select back to the current value visually
        // until the change is confirmed.
        target.value = currentAccessLevel.value ?? "";
    }
}

// --- NEW: Function to confirm and apply the access level change ---
async function confirmAccessLevelChange() {
    if (pendingAccessLevel.value) {
        // *** IMPORTANT: Modify your store action to accept the second argument ***
        // Example: await boardStore.updateBoardAccessLevel(pendingAccessLevel.value, removeExistingAccess.value);
        await boardStore.updateBoardAccessLevel(
            pendingAccessLevel.value,
            removeExistingAccess.value, // Pass checkbox state to store action
        );
        // Reset state after action (success or failure handled by store/UI updates)
        showAccessConfirmationModal.value = false;
        pendingAccessLevel.value = null;
    }
}

// --- NEW: Function to cancel the access level change ---
function cancelAccessLevelChange() {
    showAccessConfirmationModal.value = false;
    pendingAccessLevel.value = null;
}

// --- Computed property for confirmation modal text ---
const confirmationDetails = computed(() => {
    if (!pendingAccessLevel.value) return null;
    const selectedLevelDetails = accessLevels.find(
        (l) => l.value === pendingAccessLevel.value,
    );
    const currentLevelDetails = accessLevels.find(
        (l) => l.value === currentAccessLevel.value,
    );
    return {
        from: currentLevelDetails?.label ?? "Current",
        to: selectedLevelDetails?.label ?? "Selected",
        description: selectedLevelDetails?.description,
    };
});
</script>

<template>
    <div class="settings-tab space-y-6">
        <div>
            <h3 class="text-lg font-medium text-gray-800 mb-4">Appearance</h3>

            <div class="space-y-4">
                <!-- Color scheme selection -->
                <div>
                    <h4 class="text-sm font-medium text-gray-700 mb-3">
                        Color Scheme
                    </h4>

                    <div class="grid grid-cols-3 gap-3">
                        <!-- Light mode option -->
                        <button
                            @click="colorScheme = 'light'"
                            class="flex flex-col items-center justify-center p-3 rounded-lg border transition-colors"
                            :class="[
                                colorScheme === 'light'
                                    ? 'bg-blue-50  border-blue-200 '
                                    : 'bg-white  border-gray-200  hover:bg-gray-50 ',
                            ]"
                        >
                            <div
                                class="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center mb-2"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    class="text-yellow-600"
                                >
                                    <circle cx="12" cy="12" r="5"></circle>
                                    <line x1="12" y1="1" x2="12" y2="3"></line>
                                    <line
                                        x1="12"
                                        y1="21"
                                        x2="12"
                                        y2="23"
                                    ></line>
                                    <line
                                        x1="4.22"
                                        y1="4.22"
                                        x2="5.64"
                                        y2="5.64"
                                    ></line>
                                    <line
                                        x1="18.36"
                                        y1="18.36"
                                        x2="19.78"
                                        y2="19.78"
                                    ></line>
                                    <line x1="1" y1="12" x2="3" y2="12"></line>
                                    <line
                                        x1="21"
                                        y1="12"
                                        x2="23"
                                        y2="12"
                                    ></line>
                                    <line
                                        x1="4.22"
                                        y1="19.78"
                                        x2="5.64"
                                        y2="18.36"
                                    ></line>
                                    <line
                                        x1="18.36"
                                        y1="5.64"
                                        x2="19.78"
                                        y2="4.22"
                                    ></line>
                                </svg>
                            </div>
                            <span class="text-sm text-gray-700 font-medium">
                                Light
                            </span>
                        </button>

                        <!-- Dark mode option -->
                        <button
                            @click="colorScheme = 'dark'"
                            class="flex flex-col items-center justify-center p-3 rounded-lg border transition-colors"
                            :class="[
                                colorScheme === 'dark'
                                    ? 'bg-blue-50  border-blue-200 '
                                    : 'bg-white  border-gray-200  hover:bg-gray-50 ',
                            ]"
                        >
                            <div
                                class="w-8 h-8 bg-indigo-900 rounded-full flex items-center justify-center mb-2"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    class="text-indigo-100"
                                >
                                    <path
                                        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                                    ></path>
                                </svg>
                            </div>
                            <span class="text-sm text-gray-700 font-medium">
                                Dark
                            </span>
                        </button>

                        <!-- System mode option -->
                        <button
                            @click="colorScheme = 'system'"
                            class="flex flex-col items-center justify-center p-3 rounded-lg border transition-colors"
                            :class="[
                                colorScheme === 'system'
                                    ? 'bg-blue-50  border-blue-200 '
                                    : 'bg-white  border-gray-200  hover:bg-gray-50 ',
                            ]"
                        >
                            <div
                                class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mb-2"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    class="text-gray-600 dark:text-gray-300"
                                >
                                    <rect
                                        x="2"
                                        y="3"
                                        width="20"
                                        height="14"
                                        rx="2"
                                        ry="2"
                                    ></rect>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                    <line
                                        x1="12"
                                        y1="17"
                                        x2="12"
                                        y2="21"
                                    ></line>
                                </svg>
                            </div>
                            <span class="text-sm text-gray-700 font-medium">
                                System
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="isOwner" class="space-y-6">
            <hr class="border-gray-200" />
            <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">
                    Sharing & Access
                </h3>

                <!-- Share Button -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 mb-2">
                        Invite Collaborators
                    </h4>
                    <Button
                        @click="showSharePopup = true"
                        class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 gap-2 transition-colors mx-2"
                        :disabled="loadingAccess"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path
                                d="m13.576 17.271l-5.11-2.787a3.5 3.5 0 1 1 0-4.968l5.11-2.787a3.5 3.5 0 1 1 .958 1.755l-5.11 2.787a3.5 3.5 0 0 1 0 1.457l5.11 2.788a3.5 3.5 0 1 1-.958 1.755"
                            />
                        </svg>
                        Manage Access & Share
                    </Button>
                    <BoardSharePopup v-model="showSharePopup" />
                </div>
                <!-- NEW: Access Level Selection -->
                <div>
                    <label
                        for="boardAccessLevelSelect"
                        class="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Board Access Level
                    </label>
                    <select
                        id="boardAccessLevelSelect"
                        :value="currentAccessLevel"
                        @change="handleAccessLevelChange"
                        :disabled="loadingAccess || !currentAccessLevel"
                        class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:opacity-50"
                    >
                        <option v-if="!currentAccessLevel" value="" disabled>
                            Loading...
                        </option>
                        <option
                            v-for="level in accessLevels"
                            :key="level.value"
                            :value="level.value"
                        >
                            {{ level.label }}
                        </option>
                    </select>
                    <!-- Display Description -->
                    <p
                        v-if="currentAccessLevel"
                        class="mt-2 text-sm text-gray-500 dark:text-gray-400"
                    >
                        {{
                            accessLevels.find(
                                (l) => l.value === currentAccessLevel,
                            )?.description
                        }}
                    </p>
                    <!-- Display Error -->
                    <p
                        v-if="errorAccess"
                        class="mt-2 text-sm text-red-600 dark:text-red-400"
                    >
                        Error updating access: {{ errorAccess }}
                    </p>
                    <!-- Display Loading -->
                    <p
                        v-if="loadingAccess && !showAccessConfirmationModal"
                        class="mt-2 text-sm text-gray-500 dark:text-gray-400 animate-pulse"
                    >
                        Updating access level...
                    </p>
                </div>
            </div>
        </div>
        <div v-if="isOldBoard !== true && isOwner === true">
            <div>
                <h3 class="text-lg font-medium text-gray-800 mb-4">
                    Delete Board
                </h3>
                <button @click="deleteOpen = true" class="delete-button">
                    Delete Board
                </button>
                <DeleteBoardModal
                    v-model="deleteOpen"
                    @delete-board="handleDeleteBoard"
                />
            </div>

            <Modal
                v-model="showAccessConfirmationModal"
                title="Confirm Access Level Change"
                :close-on-backdrop-click="!loadingAccess"
                :close-on-esc="!loadingAccess"
                :show-close-button="!loadingAccess"
            >
                <div v-if="confirmationDetails" class="space-y-4">
                    <p class="text-sm text-gray-700">
                        You are about to change the board access level from
                        <strong class="font-medium">{{
                            confirmationDetails.from
                        }}</strong>
                        to
                        <strong class="font-medium">{{
                            confirmationDetails.to
                        }}</strong
                        >.
                    </p>
                    <p class="text-sm text-gray-500">
                        <strong>Description:</strong>
                        {{ confirmationDetails.description }}
                    </p>

                    <div class="relative flex items-start mt-4">
                        <div class="flex items-center h-5">
                            <input
                                id="removeAccessCheckbox"
                                v-model="removeExistingAccess"
                                :disabled="loadingAccess"
                                type="checkbox"
                                class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                        </div>
                        <div class="ml-3 text-sm">
                            <label
                                for="removeAccessCheckbox"
                                class="font-medium text-gray-700"
                                >Remove existing user access?</label
                            >
                            <p class="text-gray-500">
                                Check this to remove all currently invited
                                collaborators (except the owner). Leave
                                unchecked to keep existing collaborators.
                            </p>
                        </div>
                    </div>

                    <!-- Optional: Display error specific to the modal action -->
                    <p
                        v-if="errorAccess && showAccessConfirmationModal"
                        class="mt-2 text-sm text-red-600"
                    >
                        Failed to update: {{ errorAccess }}
                    </p>

                    <p
                        v-if="loadingAccess && showAccessConfirmationModal"
                        class="mt-2 text-sm text-gray-500 animate-pulse"
                    >
                        Updating...
                    </p>
                </div>
                <template #footer>
                    <button
                        type="button"
                        @click="cancelAccessLevelChange"
                        :disabled="loadingAccess"
                        class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        @click="confirmAccessLevelChange"
                        :disabled="loadingAccess"
                        class="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {{ loadingAccess ? "Updating..." : "Confirm Change" }}
                    </button>
                </template>
            </Modal>
        </div>
    </div>
</template>

<style scoped>
.settings-tab {
    min-height: 300px;
}

.delete-button {
    padding: 8px 20px;
    border-radius: 6px;
    font-weight: 500;
    background-color: #ef4444;
    color: white;
    border: none;
    transition: all 0.2s;
    font-size: 14px;
    padding: 8px 20px;
    border-radius: 6px;
    font-weight: 500;
    background-color: #ef4444;
    color: white;
    border: none;
    transition: all 0.2s;
    font-size: 14px;
}
</style>
