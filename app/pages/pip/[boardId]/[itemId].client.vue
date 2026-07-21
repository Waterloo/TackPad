<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBoardStore } from '~/stores/board'
import StickyNote  from '~/components/widgets/StickyNote.vue'
import TodoList    from '~/components/widgets/TodoList.vue'
import LinkItem    from '~/components/widgets/LinkItem.vue'
import Timer       from '~/components/widgets/Timer.vue'
import TextWidget  from '~/components/widgets/TextWidget.vue'
import SecretNote from '~/components/widgets/SecretNote.vue'
import SecretKeyValue from '~/components/widgets/SecretKeyValue.vue'
import ImageWidget from '~/components/widgets/ImageWidget.vue'
import AudioWidget from '~/components/widgets/AudioWidget.vue'
import FileWidget  from '~/components/widgets/FileWidget.vue'
import Tacklet     from '~/components/widgets/Tacklet.vue'

definePageMeta({ layout: false })

const route   = useRoute()
const boardId = route.params.boardId as string
const itemId  = route.params.itemId  as string

const boardStore = useBoardStore()
const { items, isLoaded } = storeToRefs(boardStore)

const item = computed(() => items.value.get(itemId))

const WIDGET_COMPONENTS = {
  note:    StickyNote,
  todo:    TodoList,
  link:    LinkItem,
  timer:   Timer,
  text:    TextWidget,
  secret_note: SecretNote,
  secret_kv: SecretKeyValue,
  image:   ImageWidget,
  audio:   AudioWidget,
  file:    FileWidget,
  tacklet: Tacklet,
} as const

const widgetComponent = computed(() =>
  item.value ? WIDGET_COMPONENTS[item.value.kind as keyof typeof WIDGET_COMPONENTS] ?? null : null
)

onMounted(async () => {
  await boardStore.initializeBoard(boardId)
})

onUnmounted(() => boardStore.destroyBoard())
</script>

<template>
  <div class="pip-root">
    <div v-if="!isLoaded" class="pip-loading">
      <div class="pip-spinner" />
    </div>

    <template v-else-if="item && widgetComponent">
      <!-- Size the container to match the board item's dimensions exactly.
           Widgets are built to fill a sized parent (same as WidgetWrapper does). -->
      <div
        class="pip-widget-shell"
        :style="{ width: `${item.width}px`, height: `${item.height}px` }"
      >
        <component :is="widgetComponent" :item-id="itemId" />
      </div>
    </template>

    <div v-else class="pip-empty">
      Widget not found
    </div>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #F3F4F6;
  overflow: hidden;
}
</style>

<style scoped>
.pip-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.pip-widget-shell {
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.07),
    0 1px 2px rgba(0, 0, 0, 0.05);
  position: relative;
}

.pip-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.pip-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #E5E7EB;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.pip-empty {
  font-size: 13px;
  color: #9CA3AF;
}
</style>
