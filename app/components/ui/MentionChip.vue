<script setup lang="ts">
import { useBoardStore } from '~/stores/board'

const props = defineProps<{
  type: 'user' | 'item' | 'board'
  id: string
  label: string
}>()

const boardStore = useBoardStore()

function handleClick() {
  if (props.type === 'item') {
    boardStore.panToItem(props.id)
  }
  else if (props.type === 'board') {
    navigateTo(`/board/${props.id}`)
  }
}

const chipClass = computed(() => `mc-chip mc-chip--${props.type}`)
</script>

<template>
  <span
    :class="chipClass"
    role="button"
    tabindex="0"
    @click.stop="handleClick"
    @keydown.enter.stop="handleClick"
  >@{{ label }}</span>
</template>

<style scoped>
.mc-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  vertical-align: baseline;
  transition: filter 0.1s;
}

.mc-chip:hover { filter: brightness(0.92); }

.mc-chip--user  { background: #DBEAFE; color: #1D4ED8; }
.mc-chip--item  { background: #DCFCE7; color: #15803D; }
.mc-chip--board { background: #EDE9FE; color: #6D28D9; }
</style>
