<script setup lang="ts">
import type { MentionData } from '~/shared/types/mention'

interface Section {
  label: string
  items: MentionData[]
}

const props = defineProps<{
  sections: Section[]
  x: number
  y: number
}>()

const emit = defineEmits<{
  select: [item: MentionData]
  close: []
}>()

// Flatten all items for keyboard navigation
const flatItems = computed(() => props.sections.flatMap(s => s.items))

const activeIndex = ref(0)

watch(() => props.sections, () => { activeIndex.value = 0 })

function onKeydown(e: KeyboardEvent) {
  const total = flatItems.value.length
  if (!total) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % total
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + total) % total
  }
  else if (e.key === 'Enter') {
    e.preventDefault()
    emit('select', flatItems.value[activeIndex.value]!)
  }
  else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

// Expose for parent to call
defineExpose({ onKeydown })

const typeIcons: Record<string, string> = {
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
  item: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  board: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
}

function iconPath(type: string) {
  return typeIcons[type] || typeIcons.item
}

function chipColor(type: string) {
  switch (type) {
    case 'user': return '#2563EB'
    case 'item': return '#16A34A'
    case 'board': return '#7C3AED'
    default: return '#6B7280'
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="md-root"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <template v-if="flatItems.length === 0">
        <div class="md-empty">No results</div>
      </template>

      <template v-for="section in sections" :key="section.label">
        <div class="md-section-label">{{ section.label }}</div>
        <button
          v-for="(item, i) in section.items"
          :key="item.id"
          class="md-item"
          :class="{
            'md-item--active': flatItems.indexOf(item) === activeIndex,
            'md-item--prompt': item.id === '__set_username__',
          }"
          @mouseenter="activeIndex = flatItems.indexOf(item)"
          @mousedown.prevent="emit('select', item)"
        >
          <svg class="md-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" :stroke="item.id === '__set_username__' ? '#9CA3AF' : chipColor(item.type)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path :d="iconPath(item.type)" />
          </svg>
          <span class="md-label" :class="{ 'md-label--prompt': item.id === '__set_username__' }">
            <span v-if="item.type === 'user' && item.id !== '__set_username__'" class="md-at">@</span>{{ item.label }}
          </span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.md-root {
  position: fixed;
  z-index: 300;
  width: 240px;
  max-height: 280px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 4px;
  font-family: system-ui, sans-serif;
}

.md-section-label {
  font-size: 10px;
  font-weight: 600;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 6px 8px 3px;
}

.md-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background 0.08s;
}

.md-item--active {
  background: #F3F4F6;
}

.md-icon { flex-shrink: 0; }

.md-label {
  font-size: 13px;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.md-at {
  color: #9CA3AF;
}

.md-item--prompt { opacity: 0.85; }
.md-label--prompt { font-size: 12px; color: #6B7280; font-style: italic; }

.md-empty {
  font-size: 12px;
  color: #9CA3AF;
  text-align: center;
  padding: 12px;
}

.md-root::-webkit-scrollbar { width: 4px; }
.md-root::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 2px; }
</style>
