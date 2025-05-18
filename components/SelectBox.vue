<template>
  <div class="p-1">
    <WidgetOptions :itemId="props.itemId">
      <div class="align-tool" @mouseenter="showExtended = true" @mouseleave="showExtended = false">
        <!-- Minimal UI Always Visible -->
        <div class="main-controls">
          <div class="direction-buttons">
            <button
              v-for="direction in directions"
              :key="direction.value"
              :class="['direction-btn', {active: selectedDirection === direction.value}]"
              @click="setDirectionAndApply(direction.value)"
              :title="direction.label"
            >
                <span class="material-icons text-sm">{{direction.icon}}</span>
            </button>
          </div>

          <button
            v-if="showGridArrangeOption"
            class="grid-toggle"
            @click="toggleGridModeAndApply"
            :class="{active: gridMode}"
            :title="gridMode ? 'Switch to Alignment' : 'Switch to Grid'"
          >
              <span v-if="gridMode" class="material-icons text-sm">vertical_distribute</span>
              <span v-else class="material-icons text-sm">table_rows</span>

          </button>
        </div>

        <!-- Extended Options (Shown only on hover) -->
        <div
          class="extended-options"
          :class="{'show': showExtended}"
        >
          <div class="option-row">
            <label>Spacing:</label>
            <input
              type="number"
              v-model.number="spacing"
              min="0"
              max="100"
              class="spacing-input"
              @change="applyAlignment"
            />
          </div>

          <div class="option-row">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="sortByKind"
                @change="applyAlignment"
              />
              <span>Group by kind</span>
            </label>
          </div>

          <div v-if="gridMode" class="option-row">
            <label>Columns:</label>
            <select
              v-model="columns"
              class="columns-select"
              @change="applyAlignment"
            >
              <option value="auto">Auto</option>
              <option v-for="n in 6" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>
      </div>
    </WidgetOptions>
  </div>
</template>

<script setup>
import {useItemStore} from "~/stores/itemStore"
const itemStore = useItemStore()
const props = defineProps({
  itemId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update']);

// UI State
const selectedDirection = ref('left');
const spacing = ref(10);
const sortByKind = ref(false);
const gridMode = ref(false);
const columns = ref('auto');
const showExtended = ref(false);

// Available directions
const directions = [
  { value: 'left', label: 'Align Left', icon: 'align_horizontal_left' },
  { value: 'right', label: 'Align Right', icon: 'align_horizontal_right' },
  { value: 'top', label: 'Align Top', icon: 'align_vertical_top' },
  { value: 'bottom', label: 'Align Bottom', icon: 'align_vertical_bottom' }
];
const selectedItems = computed(() => {
  // This would be implemented to get the currently selected items
  // For now, returning mock data
  return itemStore.getSelectedItems()
});
// Computed properties
const showGridArrangeOption = computed(() => selectedItems.value.length >= 3);


// Methods
function setDirectionAndApply(direction) {
  selectedDirection.value = direction;
  applyAlignment();
}

function toggleGridModeAndApply() {
  gridMode.value = !gridMode.value;
  applyAlignment();
}

function applyAlignment() {
  console.log(selectedItems.value)
  // Don't try to apply if we don't have enough items selected
  if (selectedItems.value.length < 2) return;

  if (gridMode.value) {
    applyGridArrangement();
  } else {
    applySmartAlignment();
  }
}

function applySmartAlignment() {
  // Call the smartAlign function with the current options
  const options = {
    direction: selectedDirection.value,
    sort: sortByKind.value,
    spacing: spacing.value
  };

  // This would call the actual function and emit results
  if (selectedItems.value?.length) {
      const newPos = smartAlign(selectedItems.value,options);
      console.log(newPos)
      itemStore.updateItemsPosition(newPos);
    }
}

function applyGridArrangement() {
  // Call the gridArrange function with the current options
  const options = {
    columns: columns.value === 'auto' ? 'auto' : parseInt(columns.value),
    sort: sortByKind.value,
    spacing: spacing.value
  };

  // This would call the actual function and emit results
  if (selectedItems.value?.length) {
      const newPos = gridArrange(selectedItems.value,options);
      console.log(newPos)
      itemStore.updateItemsPosition(newPos);
    }
}
</script>

<style scoped>
.align-tool {
  position: relative;
  width: fit-content;
  border-radius: 4px;
  background: #f9f9f9;
  transition: all 0.2s ease;
}

.main-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
}

.direction-buttons {
  display: flex;
  gap: 2px;
}

.direction-btn {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.15s;
}

.direction-btn.active {
  background: #e1f0ff;
  border-color: #0078d7;
  color: #0078d7;
}

.grid-toggle {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: white;
  border: 1px solid #ddd;
  transition: all 0.15s;
}

.grid-toggle.active {
  background: #e1f0ff;
  border-color: #0078d7;
  color: #0078d7;
}

/* Extended options styling */
.extended-options {
  position: absolute;
  top: 100%;
  left: 0;
  width: 180px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  margin-top: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 10;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.extended-options.show {
  opacity: 1;
  visibility: visible;
}

.option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
}

.option-row:last-child {
  margin-bottom: 0;
}

.spacing-input, .columns-select {
  width: 60px;
  height: 22px;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.material-icons {
  display: inline-block;
  font-family: 'Material Icons', sans-serif;
  font-weight: normal;
  font-style: normal;
  font-size: 18px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}
</style>
