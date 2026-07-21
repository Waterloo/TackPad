<script setup lang="ts">
import type { MentionData } from '~/shared/types/mention'
import { useAuthStore } from '~/stores/auth'
import MentionDropdown from './MentionDropdown.vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  mentionSections: { label: string; items: MentionData[] }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'submit': []
  'cancel': []
  'blur': []
  'mentionTrigger': [query: string]
  'mentionSelect': [item: MentionData]
  'mentionDismiss': []
}>()

const editorRef = ref<HTMLDivElement | null>(null)
const dropdownRef = ref<InstanceType<typeof MentionDropdown> | null>(null)
const showDropdown = ref(false)
const dropdownPos = ref({ x: 0, y: 0 })
const mentionStartOffset = ref(-1)

// ── Marker ↔ HTML conversion ───────────────────────────────────────────────
const MENTION_RE = /@\[([^\]]+)\]\((user|item|board):([^)]+)\)/g
const CHIP_COLORS: Record<string, { bg: string; fg: string }> = {
  user: { bg: '#DBEAFE', fg: '#1D4ED8' },
  item: { bg: '#DCFCE7', fg: '#15803D' },
  board: { bg: '#EDE9FE', fg: '#6D28D9' },
}

function markersToHtml(text: string): string {
  return text.replace(MENTION_RE, (_match, label, type, id) => {
    const c = CHIP_COLORS[type] || CHIP_COLORS.user
    return `<span class="mi-chip" contenteditable="false" data-mention-type="${type}" data-mention-id="${id}" style="background:${c.bg};color:${c.fg};padding:1px 5px;border-radius:4px;font-weight:500;font-size:0.92em;white-space:nowrap;user-select:all;">@${label}</span>`
  })
}

function htmlToMarkers(el: HTMLElement): string {
  let result = ''
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || ''
    }
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const span = node as HTMLElement
      if (span.dataset.mentionType && span.dataset.mentionId) {
        const label = (span.textContent || '').replace(/^@/, '')
        result += `@[${label}](${span.dataset.mentionType}:${span.dataset.mentionId})`
      }
      else {
        result += span.textContent || ''
      }
    }
  }
  return result
}

// ── Init + sync ────────────────────────────────────────────────────────────
onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = markersToHtml(props.modelValue)
  }
})

watch(() => props.modelValue, (val) => {
  if (!editorRef.value) return
  const current = htmlToMarkers(editorRef.value)
  if (current !== val) {
    // Preserve cursor if possible
    editorRef.value.innerHTML = markersToHtml(val)
    placeCaretAtEnd(editorRef.value)
  }
})

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

// ── Input handling ─────────────────────────────────────────────────────────
function onInput() {
  if (!editorRef.value) return
  const text = htmlToMarkers(editorRef.value)
  emit('update:modelValue', text)
  checkForMentionTrigger()
}

function checkForMentionTrigger() {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount || !editorRef.value) {
    showDropdown.value = false
    return
  }

  const range = sel.getRangeAt(0)
  // Only check within text nodes
  if (range.startContainer.nodeType !== Node.TEXT_NODE) {
    showDropdown.value = false
    return
  }

  const textNode = range.startContainer as Text
  const text = textNode.textContent || ''
  const cursor = range.startOffset

  // Walk backwards to find '@'
  let atIdx = -1
  for (let i = cursor - 1; i >= 0; i--) {
    if (text[i] === '@') {
      if (i === 0 || /\s/.test(text[i - 1]!)) {
        atIdx = i
      }
      break
    }
    if (/\s/.test(text[i]!)) break
  }

  if (atIdx === -1) {
    showDropdown.value = false
    return
  }

  const query = text.slice(atIdx + 1, cursor)
  mentionStartOffset.value = atIdx

  // Position dropdown
  const tempRange = document.createRange()
  tempRange.setStart(textNode, atIdx)
  tempRange.setEnd(textNode, cursor)
  const rect = tempRange.getBoundingClientRect()
  dropdownPos.value = { x: rect.left, y: rect.bottom + 4 }

  emit('mentionTrigger', query)
  showDropdown.value = true
}

function onMentionSelect(item: MentionData) {
  if (item.id === '__set_username__') {
    showDropdown.value = false
    const authStore = useAuthStore()
    authStore.requireUsername()
    return
  }
  if (!editorRef.value) return

  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return

  const range = sel.getRangeAt(0)
  const textNode = range.startContainer as Text
  const cursor = range.startOffset
  const atIdx = mentionStartOffset.value
  if (atIdx === -1) return

  // Delete @query text
  textNode.deleteData(atIdx, cursor - atIdx)

  // Create chip element
  const c = CHIP_COLORS[item.type] || CHIP_COLORS.user
  const chip = document.createElement('span')
  chip.className = 'mi-chip'
  chip.contentEditable = 'false'
  chip.dataset.mentionType = item.type
  chip.dataset.mentionId = item.id
  chip.style.cssText = `background:${c.bg};color:${c.fg};padding:1px 5px;border-radius:4px;font-weight:500;font-size:0.92em;white-space:nowrap;user-select:all;`
  chip.textContent = `@${item.label}`

  // Insert chip at the @-position
  const insertRange = document.createRange()
  insertRange.setStart(textNode, atIdx)
  insertRange.collapse(true)
  insertRange.insertNode(chip)

  // Add a space after chip and place cursor there
  const space = document.createTextNode('\u00A0')
  chip.after(space)
  const newRange = document.createRange()
  newRange.setStartAfter(space)
  newRange.collapse(true)
  sel.removeAllRanges()
  sel.addRange(newRange)

  showDropdown.value = false

  // Emit updated value
  const text = htmlToMarkers(editorRef.value)
  emit('update:modelValue', text)
  emit('mentionSelect', item)
}

function onKeydown(e: KeyboardEvent) {
  if (showDropdown.value && ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
    e.preventDefault()
    dropdownRef.value?.onKeydown(e)
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    emit('submit')
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('cancel')
  }
}

// Prevent paste from inserting rich HTML
function onPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

// Focus helper exposed to parent
function focus() {
  editorRef.value?.focus()
  if (editorRef.value) placeCaretAtEnd(editorRef.value)
}

defineExpose({ focus })
</script>

<template>
  <div
    ref="editorRef"
    class="mi-editor"
    contenteditable="true"
    :data-placeholder="placeholder"
    @input="onInput"
    @keydown="onKeydown"
    @paste="onPaste"
    @blur="emit('blur')"
    @click.stop
    @pointerdown.stop
  />

  <MentionDropdown
    v-if="showDropdown"
    ref="dropdownRef"
    :sections="mentionSections"
    :x="dropdownPos.x"
    :y="dropdownPos.y"
    @select="onMentionSelect"
    @close="showDropdown = false"
  />
</template>

<style scoped>
.mi-editor {
  flex: 1;
  font-size: 13px;
  color: #374151;
  outline: none;
  min-width: 0;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.5;
}

.mi-editor:empty::before {
  content: attr(data-placeholder);
  color: #D1D5DB;
  pointer-events: none;
}
</style>
