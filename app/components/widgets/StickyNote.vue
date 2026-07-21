<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { useDebounceFn } from '@vueuse/core'
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import { useMentionSuggestions } from '~/composables/useMentionSuggestions'
import { MentionExtension } from '~/extensions/tiptap-mention'
import type { StickyNote } from '~/shared/types/board'
import type { MentionData } from '~/shared/types/mention'
import MentionDropdown from '~/components/ui/MentionDropdown.vue'
import WidgetOptions from './WidgetOptions.vue'
import NoteColorPicker from '~/components/ui/ColorPicker.vue'

const props = defineProps<{ itemId: string }>()
const boardStore = useBoardStore()
const authStore = useAuthStore()

const currentBoardId = computed(() => boardStore.boardId)
const { loadAll, filteredResults } = useMentionSuggestions(currentBoardId)

const item = computed(() => boardStore.items.get(props.itemId) as StickyNote | undefined)

// ── Mention dropdown state ──────────────────────────────────────────────────
const mentionDropdownRef = ref<InstanceType<typeof MentionDropdown> | null>(null)
const mentionSections = ref<{ label: string; items: MentionData[] }[]>([])
const mentionPos = ref({ x: 0, y: 0 })
const showMentionDropdown = ref(false)
let mentionCommand: ((attrs: Record<string, unknown>) => void) | null = null

function sendMentionNotification(mentionItem: MentionData) {
  if (mentionItem.type !== 'user') return
  const profile = authStore.profile
  if (!profile) return

  $fetch('/api/notifications/mention', {
    method: 'POST',
    body: {
      recipientId: mentionItem.id,
      boardId: boardStore.boardId,
      boardTitle: boardStore.title,
      itemId: props.itemId,
      itemKind: 'note',
      itemDisplayName: item.value?.displayName || 'Sticky Note',
      context: item.value?.content?.text?.replace(/<[^>]*>/g, '').slice(0, 100) || '',
    },
  }).catch(() => { /* silent — offline-safe */ })
}

// Derive a slightly darker tint of the note color for placeholder / accents
const accentColor = computed(() => {
  const hex = item.value?.content?.color
  if (typeof hex !== 'string' || hex.length < 7) return 'rgba(180, 160, 50, 0.4)'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${Math.round(r * 0.6)}, ${Math.round(g * 0.6)}, ${Math.round(b * 0.6)}, 0.5)`
})

const saveContent = useDebounceFn((html: string) => {
  if (!item.value) return
  // Read current color at flush time so we never overwrite a color change
  const currentColor = item.value.content?.color ?? '#FDE68A'
  boardStore.updateItem(props.itemId, {
    content: { text: html, color: currentColor },
  })
}, 500)

const editor = useEditor({
  content: item.value?.content.text ?? '',
  extensions: [
    StarterKit,
    MentionExtension.configure({
      suggestion: {
        items: ({ query }: { query: string }) => {
          return filteredResults(query)
        },
        command: ({ editor, range, props }: { editor: any; range: any; props: Record<string, unknown> }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: 'mention', attrs: props },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
        render: () => {
          return {
            onStart: (suggestionProps: any) => {
              loadAll()
              mentionCommand = suggestionProps.command
              const rect = suggestionProps.clientRect?.()
              if (rect) {
                mentionPos.value = { x: rect.left, y: rect.bottom + 4 }
              }
              mentionSections.value = suggestionProps.items || []
              showMentionDropdown.value = true
            },
            onUpdate: (suggestionProps: any) => {
              mentionCommand = suggestionProps.command
              const rect = suggestionProps.clientRect?.()
              if (rect) {
                mentionPos.value = { x: rect.left, y: rect.bottom + 4 }
              }
              mentionSections.value = suggestionProps.items || []
            },
            onKeyDown: (suggestionProps: any) => {
              if (suggestionProps.event.key === 'Escape') {
                showMentionDropdown.value = false
                return true
              }
              mentionDropdownRef.value?.onKeydown(suggestionProps.event)
              return ['ArrowUp', 'ArrowDown', 'Enter'].includes(suggestionProps.event.key)
            },
            onExit: () => {
              showMentionDropdown.value = false
              mentionCommand = null
            },
          }
        },
      },
    }),
  ],
  editorProps: {
    attributes: { class: 'tiptap-note-editor' },
  },
  onUpdate: ({ editor }) => saveContent(editor.getHTML()),
})

function onMentionSelect(mentionItem: MentionData) {
  if (mentionItem.id === '__set_username__') {
    showMentionDropdown.value = false
    authStore.requireUsername()
    return
  }
  if (mentionCommand) {
    mentionCommand({
      'data-mention-type': mentionItem.type,
      'data-mention-id': mentionItem.id,
      label: mentionItem.label,
    })
    sendMentionNotification(mentionItem)
  }
  showMentionDropdown.value = false
}

// Sync lock state
watch(() => item.value?.lock, (locked) => {
  editor.value?.setEditable(!locked)
}, { immediate: true })

// Sync color change (no content change needed)
watch(() => item.value?.content?.color, () => {}, { immediate: false })

// Sync external content changes (e.g. from another peer via Yjs)
watch(() => item.value?.content?.text, (newText) => {
  if (!editor.value || newText === undefined) return
  const current = editor.value.getHTML()
  if (newText !== current) {
    editor.value.commands.setContent(newText, false)
  }
})

onUnmounted(() => editor.value?.destroy())

function updateColor(color: string) {
  if (!item.value) return
  // Read current text at write time so we never lose typed content
  const currentText = item.value.content?.text ?? ''
  boardStore.updateItem(props.itemId, {
    content: { text: currentText, color },
  })
}
</script>

<template>
  <div
    v-if="item"
    class="note-root"
    :style="{
      background: item.content?.color ?? '#FDE68A',
      '--note-accent': accentColor,
    }"
  >
    <EditorContent :editor="editor" class="note-editor-wrap" />

    <WidgetOptions :item-id="itemId">
      <NoteColorPicker :color="item.content?.color ?? '#FDE68A'" @change="updateColor" />
    </WidgetOptions>

    <!-- Mention dropdown -->
    <MentionDropdown
      v-if="showMentionDropdown"
      ref="mentionDropdownRef"
      :sections="mentionSections"
      :x="mentionPos.x"
      :y="mentionPos.y"
      @select="onMentionSelect"
      @close="showMentionDropdown = false"
    />
  </div>
</template>

<style scoped>
.note-root {
  width: 100%;
  height: 100%;
  background: #FDE68A; /* fallback; overridden by inline :style when item data is present */
  border-radius: inherit;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.note-editor-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  min-height: 0;
}

.note-editor-wrap :deep(.tiptap-note-editor) {
  height: 100%;
  outline: none;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 13.5px;
  line-height: 1.65;
  color: rgba(0, 0, 0, 0.75);
  word-break: break-word;
}

.note-editor-wrap :deep(.tiptap-note-editor p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: var(--note-accent, rgba(0,0,0,0.3));
  pointer-events: none;
  float: left;
  height: 0;
}

.note-editor-wrap :deep(.tiptap-note-editor p) { margin: 0 0 4px; }
.note-editor-wrap :deep(.tiptap-note-editor ul),
.note-editor-wrap :deep(.tiptap-note-editor ol) { padding-left: 18px; margin: 4px 0; }
.note-editor-wrap :deep(.tiptap-note-editor strong) { font-weight: 700; }
.note-editor-wrap :deep(.tiptap-note-editor em) { font-style: italic; }
.note-editor-wrap :deep(.tiptap-note-editor h1) { font-size: 17px; font-weight: 700; margin: 0 0 6px; }
.note-editor-wrap :deep(.tiptap-note-editor h2) { font-size: 15px; font-weight: 600; margin: 0 0 4px; }

/* Mention chips in editor */
.note-editor-wrap :deep(.tiptap-note-editor .mention) {
  cursor: pointer;
  user-select: all;
}

/* Scrollbar */
.note-editor-wrap::-webkit-scrollbar { width: 4px; }
.note-editor-wrap::-webkit-scrollbar-track { background: transparent; }
.note-editor-wrap::-webkit-scrollbar-thumb { background: var(--note-accent); border-radius: 2px; }
</style>
