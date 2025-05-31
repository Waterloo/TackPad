<template>
  <div class="group-container">
    <WidgetOptions :itemId="props.itemId">
      <div class="group-controls">
        <div class="group-header flex gap-2 p-2  items-center">

          <div class="group-actions">
            <button
              @click="ungroupItems"
              class="ungroup-btn flex gap-2"
              title="Ungroup Items"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="16" viewBox="0 0 640 512"><!-- Icon from Font Awesome Regular by Dave Gandy - https://creativecommons.org/licenses/by/4.0/ --><path fill="currentColor" d="M48.2 66.8c-.1-.8-.2-1.7-.2-2.5v-.2c0-8.8 7.2-16 16-16c.9 0 1.9.1 2.8.2C74.3 49.5 80 56.1 80 64c0 8.8-7.2 16-16 16c-7.9 0-14.5-5.7-15.8-13.2M0 64c0 26.9 16.5 49.9 40 59.3v105.3C16.5 238.1 0 261.1 0 288c0 35.3 28.7 64 64 64c26.9 0 49.9-16.5 59.3-40h201.3c9.5 23.5 32.5 40 59.3 40c35.3 0 64-28.7 64-64c0-26.9-16.5-49.9-40-59.3V123.4c23.5-9.5 40-32.5 40-59.3c0-35.3-28.7-64-64-64c-26.9 0-49.9 16.5-59.3 40L123.3 40C113.9 16.5 90.9 0 64 0C28.7 0 0 28.7 0 64m368 0a16 16 0 1 1 32 0a16 16 0 1 1-32 0m-43.3 24c6.5 16 19.3 28.9 35.3 35.3v105.3c-16 6.5-28.9 19.3-35.3 35.3H123.4c-6.5-16-19.3-28.9-35.3-35.3V123.3c16-6.5 28.9-19.3 35.3-35.3zM384 272a16 16 0 1 1 0 32a16 16 0 1 1 0-32M80 288c0 7.9-5.7 14.5-13.2 15.8c-.8.1-1.7.2-2.5.2h-.2c-8.8 0-16-7.2-16-16c0-.9.1-1.9.2-2.8c1.2-7.5 7.8-13.2 15.7-13.2c8.8 0 16 7.2 16 16m391.3-40h45.4c6.5 16 19.3 28.9 35.3 35.3v105.3c-16 6.5-28.9 19.3-35.3 35.3H315.4c-6.5-16-19.3-28.9-35.3-35.3v-36.7h-48v36.7c-23.5 9.5-40 32.5-40 59.3c0 35.3 28.7 64 64 64c26.9 0 49.9-16.5 59.3-40h201.3c9.5 23.5 32.5 40 59.3 40c35.3 0 64-28.7 64-64c0-26.9-16.5-49.9-40-59.3V283.3c23.5-9.5 40-32.5 40-59.3c0-35.3-28.7-64-64-64c-26.9 0-49.9 16.5-59.3 40H448v16.4c9.8 8.8 17.8 19.5 23.3 31.6m88.9-26.7a16 16 0 1 1 31.5 5.5a16 16 0 1 1-31.5-5.5M271.8 450.7a16 16 0 1 1-31.5-5.5a16 16 0 1 1 31.5 5.5m307-18.5a16 16 0 1 1-5.5 31.5a16 16 0 1 1 5.5-31.5"/></svg>

            </button>
          </div>
          <div class="group-info">
            <span class="item-count text-xs text-gray-600">({{ groupedItems.length }} items)</span>
          </div>
        </div>
      </div>
    </WidgetOptions>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGroupStore } from '~/stores/groupStore'
import { useBoardStore } from '~/stores/board'

const groupStore = useGroupStore()
const boardStore = useBoardStore()

const props = defineProps({
  itemId: {
    type: String,
    required: true,
  },
})

// Get the group data
const groupData = computed(() => {
  if (!boardStore.board?.data.items) return null
  return boardStore.board.data.items.find(
    item => item.id === props.itemId && item.kind === 'group'
  )
})

// Get grouped items
const groupedItems = computed(() => {
  if (!groupData.value || !boardStore.board?.data.items) return []

  const itemIds = groupData.value.content.itemIds
  return boardStore.board.data.items.filter(item =>
    itemIds.includes(item.id) && item.kind !== 'group'
  )
})

// Group label
const groupLabel = computed(() => {
  return groupData.value?.content.label || 'Group'
})

// Ungroup function
const ungroupItems = () => {
  groupStore.ungroupItems(props.itemId)
}

// Get icon for item type
const getItemIcon = (kind) => {
  const icons = {
    note: 'sticky_note_2',
    todo: 'checklist',
    timer: 'timer',
    text: 'text_fields',
    image: 'image',
    link: 'link',
    audio: 'audiotrack',
    file: 'attach_file'
  }
  return icons[kind] || 'widgets'
}
</script>

<style scoped>
.group-container {
  width: 100%;
  height: 100%;
  padding: 8px;
  border: 2px dashed #6c757d;
  border-radius: 8px;
  min-height: 120px;
  box-sizing: border-box;
}
</style>
