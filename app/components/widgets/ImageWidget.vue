<script setup lang="ts">
import { useBoardStore } from '~/stores/board'
import type { ImageWidget } from '~/shared/types/board'
import { useSignedUploadUrl } from '~/composables/useSignedUploadUrl'

const props = defineProps<{ itemId: string }>()
const boardStore = useBoardStore()
const item = computed(() => boardStore.items.get(props.itemId) as ImageWidget | undefined)
const uploadId = computed(() => item.value?.content.uploadId ?? null)
const fallbackUrl = computed(() => item.value?.content.url ?? '')
const { signedUrl, refreshSignedUrl } = useSignedUploadUrl(uploadId, fallbackUrl)

const loading = ref(true)
const errored = ref(false)
const isEditingCaption = ref(false)
const captionDraft = ref('')

watch(item, (next) => {
  captionDraft.value = next?.content.caption ?? ''
}, { immediate: true })

watch(signedUrl, (url) => {
  if (!url) {
    loading.value = false
    errored.value = false
    return
  }
  loading.value = true
  errored.value = false
}, { immediate: true })

function onImageLoaded() {
  loading.value = false
  errored.value = false
}

function onImageError() {
  loading.value = false
  errored.value = true
  void refreshSignedUrl(true)
}

function startCaptionEdit() {
  if (!item.value) return
  captionDraft.value = item.value.content.caption ?? ''
  isEditingCaption.value = true
}

function saveCaption() {
  if (!item.value) return
  boardStore.updateItem(props.itemId, {
    content: {
      ...item.value.content,
      caption: captionDraft.value.trim() || null,
    },
  } as Partial<ImageWidget>)
  isEditingCaption.value = false
}
</script>

<template>
  <div v-if="item" class="image-root">
    <div v-if="loading && signedUrl" class="image-loading">Loading image...</div>
    <img
      v-if="signedUrl"
      :src="signedUrl"
      :alt="item.content.alt ?? ''"
      class="image-fill"
      draggable="false"
      @load="onImageLoaded"
      @error="onImageError"
    />
    <div v-if="signedUrl && errored" class="image-placeholder image-placeholder--error">
      <span>Image unavailable</span>
    </div>
    <div v-if="!signedUrl" class="image-placeholder">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span>No image</span>
    </div>

    <div class="image-caption-wrap" @pointerdown.stop>
      <input
        v-if="isEditingCaption"
        v-model="captionDraft"
        class="image-caption-input"
        maxlength="120"
        placeholder="Add caption..."
        @blur="saveCaption"
        @keydown.enter.prevent="saveCaption"
        @keydown.esc.prevent="isEditingCaption = false"
      >
      <button
        v-else
        class="image-caption-btn"
        @click.stop="startCaptionEdit"
      >
        {{ item.content.caption || 'Add caption' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.image-root {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  background: #F9FAFB;
  position: relative;
}

.image-fill {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  pointer-events: none;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #9CA3AF;
  font-size: 12px;
}

.image-placeholder--error {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.92);
}

.image-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #6B7280;
  background: rgba(255, 255, 255, 0.9);
  z-index: 2;
}

.image-caption-wrap {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 3;
}

.image-caption-btn,
.image-caption-input {
  width: 100%;
  border: none;
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.62);
  color: #fff;
  height: 26px;
  padding: 0 9px;
  font-size: 11px;
  text-align: left;
  backdrop-filter: blur(3px);
}

.image-caption-btn {
  cursor: text;
}

.image-caption-input {
  outline: none;
}

.image-caption-input::placeholder {
  color: rgba(255, 255, 255, 0.72);
}
</style>
