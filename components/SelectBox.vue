<template>
    <div class="p-1">
        <WidgetOptions :itemId="props.itemId">
            <div>
                <div class="alignment-tool">
                    <div class="control-bar">
                        <!-- Mode Selection with Hover Popovers -->
                        <div class="mode-selector">
                            <!-- Align Mode Button with Popover -->
                            <div class="mode-container">
                                <button
                                    class="mode-btn"
                                    :class="{ active: !gridMode }"
                                    @click="
                                        showAlignOptions = !showAlignOptions
                                    "
                                    title="Alignment Options"
                                >
                                    <span class="material-icons text-sm"
                                        >vertical_distribute</span
                                    >
                                    <span class="btn-label">Align</span>
                                </button>

                                <!-- Align Options Popover -->
                                <div
                                    class="popover align-popover w-full"
                                    v-show="showAlignOptions"
                                    @mouseleave="showAlignOptions = false"
                                >
                                    <button
                                        v-for="direction in directions"
                                        :key="direction.value"
                                        :class="[
                                            'option-btn',
                                            {
                                                active:
                                                    !gridMode &&
                                                    selectedDirection ===
                                                        direction.value,
                                            },
                                        ]"
                                        @click="
                                            selectAndApplyAlignOption(
                                                direction.value,
                                            )
                                        "
                                        :title="direction.label"
                                    >
                                        <span class="material-icons text-sm">{{
                                            direction.icon
                                        }}</span>
                                        <span class="option-label">{{
                                            direction.label
                                        }}</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Grid Mode Button with Popover -->
                            <div class="mode-container">
                                <button
                                    class="mode-btn"
                                    :class="{ active: gridMode }"
                                    title="Grid Options"
                                    @click="showGridOptions = !showGridOptions"
                                >
                                    <span class="material-icons text-sm"
                                        >grid_view</span
                                    >
                                    <span class="btn-label">More</span>
                                </button>

                                <!-- Grid Options Popover -->
                                <div
                                    class="popover grid-popover w-80"
                                    v-show="showGridOptions"
                                >
                                    <div class="flex gap-3 items-center">
                                        <div class="flex flex-col w-full">
                                            <div
                                                class="text-gray-500 py-3 text-xs"
                                            >
                                                Grid Options
                                            </div>
                                            <div class="grid-presets">
                                                <button
                                                    v-for="preset in gridPresets"
                                                    :key="preset.label"
                                                    :class="[
                                                        'preset-btn',
                                                        {
                                                            active:
                                                                gridMode &&
                                                                gridColumns ===
                                                                    preset.x &&
                                                                gridRows ===
                                                                    preset.y,
                                                        },
                                                    ]"
                                                    @click="
                                                        selectAndApplyGridPreset(
                                                            preset.x,
                                                            preset.y,
                                                        )
                                                    "
                                                    :title="`${preset.label} Grid`"
                                                >
                                                    {{ preset.label }}
                                                </button>
                                            </div>
                                        </div>


                                        <div class="my-2 w-full">
                                            <div
                                                class="text-gray-500 py-3 text-xs"
                                            >
                                                Grid Options
                                            </div>
                                          <div class=" flex">
                                              <div class="spacing-control">
                                                                                            <span
                                                                                                class="material-icons text-sm"
                                                                                                >space_bar</span
                                                                                            >
                                                                                            <input
                                                                                                type="number"
                                                                                                v-model.number="
                                                                                                    itemStore.itemSpacing
                                                                                                "
                                                                                                min="0"
                                                                                                max="100"
                                                                                                class="spacing-input"
                                                                                                @change="applyCurrentLayout"
                                                                                                title="Item Spacing"
                                                                                            />
                                                                                        </div>

                                                                                        <label
                                                                                            class="checkbox-control"
                                                                                            title="Group items by type"
                                                                                        >
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                v-model="
                                                                                                    itemStore.itemSortOnAlign
                                                                                                "
                                                                                                @change="applyCurrentLayout"
                                                                                            />
                                                                                            <span
                                                                                                class="material-icons text-sm"
                                                                                                >sort</span
                                                                                            >
                                                                                        </label>

                                          </div>

                                        </div>

                                    </div>

                                    <div class="text-gray-500 py-3 text-xs">
                                        Advanced Grid Options
                                    </div>
                                    <div class="grid-custom">
                                        <div class="dimension-inputs">
                                            <div class="dimension-input">
                                                <span class="dimension-label"
                                                    >X:</span
                                                >
                                                <input
                                                    type="number"
                                                    v-model.number="
                                                        tempGridColumns
                                                    "
                                                    min="1"
                                                    max="12"
                                                    class="grid-input"
                                                />
                                            </div>
                                            <div class="dimension-input">
                                                <span class="dimension-label"
                                                    >Y:</span
                                                >
                                                <input
                                                    type="number"
                                                    v-model.number="
                                                        tempGridRows
                                                    "
                                                    min="1"
                                                    max="12"
                                                    class="grid-input"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            class="apply-grid-btn my-2"
                                            @click="applyCustomGrid"
                                            title="Apply Custom Grid"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            title="Group Items"
                            class="border-r-2 border-gray-400 pr-4"
                        >
                            <button
                                @click="handleCreateGroup"
                                class="flex p-2 justify-center items-center hover:bg-gray-200 text-sm cursor-pointer rounded"
                                :disabled="
                                    !selectedItems || selectedItems.length < 2
                                "
                                :class="{
                                    'opacity-50 cursor-not-allowed':
                                        !selectedItems ||
                                        selectedItems.length < 2,
                                }"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                >
                                    <!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
                                    <path
                                        fill="currentColor"
                                        d="M8 17.95q.25.025.488.038T9 18t.513-.012t.487-.038V20h10V10h-2.05q.025-.25.038-.488T18 9t-.012-.513T17.95 8H20q.825 0 1.413.588T22 10v10q0 .825-.587 1.413T20 22H10q-.825 0-1.412-.587T8 20zM9 16q-2.925 0-4.962-2.037T2 9t2.038-4.962T9 2t4.963 2.038T16 9t-2.037 4.963T9 16m0-2q2.075 0 3.538-1.463T14 9t-1.463-3.537T9 4T5.463 5.463T4 9t1.463 3.538T9 14m0-5"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div class="text-center text-gray-500 text-xs">
                            <span
                                v-if="selectedItems"
                                class="text-blue-500 font-bold"
                                >{{ selectedItems.length }}
                            </span>
                            Items Selected
                        </div>
                    </div>
                </div>
            </div>
        </WidgetOptions>
    </div>
</template>

<script setup>
const itemStore = useItemStore();
const { createGroup } = useItemManagement();
const props = defineProps({
    itemId: {
        type: String,
        required: true,
    },
});

// UI State
const selectedDirection = ref("left");
const spacing = ref(10);
const sortByKind = ref(false);
const gridMode = ref(false);
const showAlignOptions = ref(false);
const showGridOptions = ref(false);

// Grid state
const gridColumns = ref(2);
const gridRows = ref(2);
// Temporary values for custom grid inputs
const tempGridColumns = ref(2);
const tempGridRows = ref(2);

const gridPresets = [
    { label: "2×", x: 2, y: 2 },
    { label: "3×", x: 3, y: 3 },
    { label: "4×", x: 4, y: 4 },
];

// Available directions
const directions = [
    { value: "left", label: "Align Left", icon: "align_horizontal_left" },
    { value: "right", label: "Align Right", icon: "align_horizontal_right" },
    { value: "top", label: "Align Top", icon: "align_vertical_top" },
    { value: "bottom", label: "Align Bottom", icon: "align_vertical_bottom" },
];

// Get selected items
const selectedItems = computed(() => {
    return itemStore.getSelectedItems();
});

// Select and immediately apply align option
function selectAndApplyAlignOption(direction) {
    gridMode.value = false;
    selectedDirection.value = direction;
    showAlignOptions.value = false;
    applySmartAlignment();
}

// Select and immediately apply grid preset
function selectAndApplyGridPreset(columns, rows) {
    gridMode.value = true;
    gridColumns.value = columns;
    gridRows.value = rows;
    tempGridColumns.value = columns;
    tempGridRows.value = rows;
    showGridOptions.value = false;
    applyGridArrangement();
}

// Apply custom grid
function applyCustomGrid() {
    gridMode.value = true;
    // Ensure valid values
    gridColumns.value = Math.max(1, Math.min(12, tempGridColumns.value));
    gridRows.value = Math.max(1, Math.min(12, tempGridRows.value));
    showGridOptions.value = false;
    applyGridArrangement();
}

// Apply the current layout based on mode
function applyCurrentLayout() {
    if (selectedItems.value.length < 2) return;

    if (gridMode.value) {
        applyGridArrangement();
    } else {
        applySmartAlignment();
    }
}

// Core alignment functions
function applySmartAlignment() {
    const options = {
        direction: selectedDirection.value,
        sort: itemStore.itemSortOnAlign,
        spacing: itemStore.itemSpacing,
    };

    if (selectedItems.value?.length) {
        const newPos = smartAlign(selectedItems.value, options);

        itemStore.updateItemsPosition(newPos);
    }
}

function applyGridArrangement() {
    const options = {
        columns: gridColumns.value,
        rows: gridRows.value,
        sort: itemStore.itemSortOnAlign,
        spacing: itemStore.itemSpacing,
    };

    if (selectedItems.value?.length) {
        const newPos = gridArrange(selectedItems.value, options);

        itemStore.updateItemsPosition(newPos);
    }
}

function handleCreateGroup() {
    if (selectedItems.value && selectedItems.value.length >= 2) {
        createGroup();
    }
}
</script>

<style scoped>
.alignment-tool {
    position: relative;
    border-radius: 4px;
    background: #f9f9f9;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.control-bar {
    display: flex;
    align-items: center;
    padding: 4px;
    gap: 8px;
}

/* Mode selector styling */
.mode-selector {
    display: flex;
    background: white;
    border-radius: 4px;
    padding: 2px;
    gap: 2px;
}

.mode-container {
    position: relative;
}

.mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: none;
    background: transparent;
    padding: 4px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
}

.mode-btn.active {
    background: #e3e3e3;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-label {
    font-size: 12px;
}

/* Popovers */
.popover {
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%) translateY(-100%);
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 100;
    padding: 6px;
    min-width: 140px;
}

.popover::after {
    content: "";
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 12px;
    height: 12px;
    background: white;
    border-right: 1px solid #ddd;
    border-bottom: 1px solid #ddd;
    transform-origin: center;
    transform: translateX(-50%) rotate(45deg);
}

/* Align options */
.option-btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 6px 8px;
    border: none;
    background: transparent;
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    gap: 8px;
    margin-bottom: 2px;
}

.option-btn:last-child {
    margin-bottom: 0;
}

.option-btn:hover {
    background: #f0f0f0;
}

.option-btn.active {
    background: #e1f0ff;
    color: #0078d7;
}

.option-label {
    font-size: 12px;
}

/* Grid options */
.grid-popover {
    width: 300px;
}

.grid-presets {
    display: flex;
    gap: 4px;
    margin-bottom: 6px;
}

.preset-btn {
    flex: 1;
    padding: 4px 0;
    border-radius: 3px;
    border: 1px solid #ddd;
    background: white;
    font-size: 12px;
    cursor: pointer;
}

.preset-btn.active {
    background: #e1f0ff;
    border-color: #0078d7;
    color: #0078d7;
}

.preset-btn:hover {
    background: #f0f0f0;
}

.grid-custom {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.dimension-inputs {
    display: flex;
    gap: 6px;
}

.dimension-input {
    display: flex;
    align-items: center;
    flex: 1;
    background: white;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 0 6px;
    height: 26px;
}

.dimension-label {
    font-size: 12px;
    margin-right: 3px;
}

.grid-input {
    width: 100%;
    border: none;
    text-align: center;
    font-size: 12px;
    padding: 0;
}

.grid-input:focus {
    outline: none;
}

.apply-grid-btn {
    width: 100%;
    padding: 4px 0;
    border-radius: 3px;
    border: 1px solid #0078d7;
    background: #e1f0ff;
    color: #0078d7;
    font-size: 12px;
    cursor: pointer;
}

.apply-grid-btn:hover {
    background: #d0e7ff;
}


.spacing-control {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 0 4px;
    height: 28px;
}

.spacing-input {
    width: 40px;
    border: none;
    text-align: center;
    font-size: 12px;
    padding: 2px 0;
}

.spacing-input:focus {
    outline: none;
}

.checkbox-control {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 0 6px;
    height: 28px;
    cursor: pointer;
}

.checkbox-control input {
    margin-right: 4px;
}

.material-icons {
    font-family: "Material Icons", sans-serif;
    font-size: 16px;
    display: inline-flex;
}
</style>
