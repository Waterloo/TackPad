<script setup lang="ts">
import MentionChip from './MentionChip.vue'

const props = defineProps<{ content: string }>()

interface ContentPart {
  type: 'text' | 'mention'
  text?: string
  mentionType?: 'user' | 'item' | 'board'
  mentionId?: string
  mentionLabel?: string
}

const MENTION_RE = /@\[([^\]]+)\]\((user|item|board):([^)]+)\)/g

const parts = computed(() => {
  const result: ContentPart[] = []
  let lastIndex = 0

  const text = props.content
  let match: RegExpExecArray | null

  // Reset regex state
  MENTION_RE.lastIndex = 0

  while ((match = MENTION_RE.exec(text)) !== null) {
    // Text before mention
    if (match.index > lastIndex) {
      result.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    result.push({
      type: 'mention',
      mentionLabel: match[1],
      mentionType: match[2] as 'user' | 'item' | 'board',
      mentionId: match[3],
    })
    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    result.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return result
})
</script>

<template>
  <span class="tcr">
    <template v-for="(part, i) in parts" :key="i">
      <span v-if="part.type === 'text'">{{ part.text }}</span>
      <MentionChip
        v-else
        :type="part.mentionType!"
        :id="part.mentionId!"
        :label="part.mentionLabel!"
      />
    </template>
  </span>
</template>

<style scoped>
.tcr {
  display: inline;
}
</style>
