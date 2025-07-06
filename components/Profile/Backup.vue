<script setup lang="ts">
import { useBoardStore } from "@/stores/board";
import { ref, computed, watch } from "vue";
const toast = useToast();
const boardStore = useBoardStore();
const showModal = ref(false);
const displayedBoardsForExport = ref({});
const selectedBoardIdsForExport = ref(new Set<string>());
const activeTabIndex = ref(0); // For TabView component
const selectAllChecked = ref(false);
// Get the raw boards data from the store
const allBoardsFromStore = computed(() => boardStore.boards);

// Watch for modal opening to initialize/reset local state
watch(showModal, (newValue) => {
    if (newValue) {
        // When modal opens, copy the current boards from the store
        displayedBoardsForExport.value = { ...allBoardsFromStore.value };

        // Select all boards by default
        selectedBoardIdsForExport.value.clear();
        Object.keys(displayedBoardsForExport.value).forEach((boardId) => {
            selectedBoardIdsForExport.value.add(boardId);
        });
        updateSelectAllState();
    }
});

// ----- Export Logic -----
const handleCheckboxChange = (boardId: string, checked: boolean) => {
    if (checked) {
        selectedBoardIdsForExport.value.add(boardId);
    } else {
        selectedBoardIdsForExport.value.delete(boardId);
    }
    updateSelectAllState();
};

const updateSelectAllState = () => {
    const displayedIds = Object.keys(displayedBoardsForExport.value);
    selectAllChecked.value =
        displayedIds.length > 0 &&
        displayedIds.every((id) => selectedBoardIdsForExport.value.has(id));
};
const removeFromExportList = (boardId: string) => {
    delete displayedBoardsForExport.value[boardId];
    selectedBoardIdsForExport.value.delete(boardId);
};

const BACKUP_LOCALSTORAGE_KEY = "isBackedUp";
const handleExport = async () => {
    if (selectedBoardIdsForExport.value.size === 0) {
        toast.add({
            severity: "warn",
            summary: "Selection Required",
            detail: "Please select at least one board to export.",
            life: 3000,
        });
        return;
    }

    const boardsToExport = Array.from(selectedBoardIdsForExport.value)
        .map((boardId) => {
            const boardData = displayedBoardsForExport.value[boardId];
            if (boardData) {
                return { id: boardData.board_id, title: boardData.title };
            }
            return null;
        })
        .filter(Boolean);
    const res = await boardStore.backupBoards(boardsToExport);

    if (res.success === true && res.data.length > 0) {
        try {
            const filename = `tackpad_boards_backup_${new Date().toISOString().split("T")[0]}.tackpad`;
            const jsonStr = JSON.stringify(res.data, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            localStorage.setItem(BACKUP_LOCALSTORAGE_KEY, "true");
            toast.add({
                severity: "success",
                summary: "Export Successful",
                detail: `${boardsToExport.length} board(s) exported successfully!`,
                life: 3000,
            });
        } catch (err) {
            console.error("Export failed:", err);
            toast.add({
                severity: "error",
                summary: "Export Failed",
                detail: "An error occurred during export.",
                life: 3000,
            });
        }
    } else {
        toast.add({
            severity: "warn",
            summary: "Invalid Selection",
            detail: "No valid boards selected for export.",
            life: 3000,
        });
    }
};

// ----- Import Logic -----
const handleImportClick = () => {
    toast.add({
        severity: "info",
        summary: "Coming Soon",
        detail: "Import functionality will be implemented later.",
        life: 3000,
    });
};

// Helper to generate board URL
const getBoardUrl = (boardId: string) => {
    return `/board/${boardId}`;
};

const toggleSelectAll = () => {
    const displayedIds = Object.keys(displayedBoardsForExport.value);

    if (selectAllChecked.value) {
        displayedIds.forEach((id) => selectedBoardIdsForExport.value.add(id));
    } else {
        selectedBoardIdsForExport.value.clear();
    }
};

</script>

<template>
    <div>
        <Button label="Import or Export Boards" @click="showModal = true" />

        <Dialog
            v-model:visible="showModal"
            header="Import / Export Boards"
            :modal="true"
            :closable="true"
            :style="{ width: '40rem' }"
            :breakpoints="{ '960px': '75vw', '641px': '90vw' }"
        >
            <TabView v-model:activeIndex="activeTabIndex">
                <TabPanel header="Export">
                    <div class="space-y-4">
                        <p class="text-gray-600 text-sm mb-4">
                            Select the boards you want to include in the backup
                            file.
                        </p>

                        <div
                            v-if="
                                Object.keys(displayedBoardsForExport).length > 0
                            "
                            class="flex items-center gap-2 p-3 bg-gray-50 rounded-md border"
                        >
                            <Checkbox
                                inputId="select-all-export"
                                v-model="selectAllChecked"
                                @change="toggleSelectAll"
                            />
                            <label
                                for="select-all-export"
                                class="text-sm font-medium text-gray-700 cursor-pointer"
                            >
                                Select All / Deselect All
                            </label>
                        </div>

                        <div
                            v-if="
                                Object.keys(displayedBoardsForExport).length > 0
                            "
                            class="border border-gray-200 rounded-md max-h-72 overflow-y-auto"
                        >
                            <div
                                v-for="(
                                    boardData, boardId
                                ) in displayedBoardsForExport"
                                :key="boardId"
                                class="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0"
                            >
                                <div
                                    class="flex items-center gap-3 flex-1 min-w-0"
                                >
                                    <Checkbox
                                        :inputId="'export-' + boardId"
                                        :modelValue="
                                            selectedBoardIdsForExport.has(
                                                boardId,
                                            )
                                        "
                                        @update:modelValue="
                                            (checked) =>
                                                handleCheckboxChange(
                                                    boardId,
                                                    checked,
                                                )
                                        "
                                    />
                                    <label
                                        :for="'export-' + boardId"
                                        class="text-sm text-gray-900 cursor-pointer truncate"
                                    >
                                        {{ boardData.title }}
                                    </label>
                                </div>

                                <div class="flex items-center gap-2">
                                    <Button
                                        icon="pi pi-eye"
                                        severity="secondary"
                                        variant="text"
                                        size="small"
                                        @click="
                                            window.open(
                                                getBoardUrl(boardId),
                                                '_blank',
                                            )
                                        "
                                        :aria-label="`View ${boardData.title}`"
                                    />
                                    <Button
                                        icon="pi pi-trash"
                                        severity="danger"
                                        variant="text"
                                        size="small"
                                        @click="removeFromExportList(boardId)"
                                        :aria-label="`Remove ${boardData.title} from export list`"
                                    />
                                </div>
                            </div>
                        </div>

                        <div
                            v-else
                            class="text-center py-8 text-gray-500 italic"
                        >
                            No boards available to export.
                        </div>

                        <Button
                            :label="`Export ${selectedBoardIdsForExport.size} Selected Board(s)`"
                            :disabled="selectedBoardIdsForExport.size === 0"
                            @click="handleExport"
                            class="mt-4"
                        />
                    </div>
                </TabPanel>

                <TabPanel header="Import">
                    <div class="space-y-4">
                        <p class="text-gray-600 text-sm mb-4">
                            Import boards from a previously exported backup file
                            (.json).
                        </p>
                        <Button
                            label="Import from File..."
                            @click="handleImportClick"
                        />
                    </div>
                </TabPanel>
            </TabView>

            <template #footer>
                <div class="flex justify-end">
                    <Button
                        label="Close"
                        severity="secondary"
                        @click="showModal = false"
                    />
                </div>
            </template>
        </Dialog>
    </div>
</template>
