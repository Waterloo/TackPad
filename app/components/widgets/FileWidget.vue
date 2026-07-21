<script setup lang="ts">
import { useBoardStore } from '~/stores/board'
import type { FileWidget } from '~/shared/types/board'
import { useSignedUploadUrl } from '~/composables/useSignedUploadUrl'

const props = defineProps<{ itemId: string }>()
const boardStore = useBoardStore()
const item = computed(() => boardStore.items.get(props.itemId) as FileWidget | undefined)
const uploadId = computed(() => item.value?.content.uploadId ?? null)
const fallbackUrl = computed(() => item.value?.content.url ?? '')
const { signedUrl } = useSignedUploadUrl(uploadId, fallbackUrl)

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type: string | null) {
  if (!type) return 'doc'
  if (type.startsWith('image/')) return 'img'
  if (type.startsWith('video/')) return 'vid'
  if (type.startsWith('audio/')) return 'aud'
  if (type.includes('pdf')) return 'pdf'
  if (type.includes('zip') || type.includes('archive')) return 'zip'
  return 'doc'
}

const iconType = computed(() => fileIcon(item.value?.content.fileType ?? null))
const iconColors: Record<string, string> = {
  img: '#8B5CF6', vid: '#EF4444', aud: '#3B82F6',
  pdf: '#EF4444', zip: '#F59E0B', doc: '#6B7280',
}
</script>

<template>
  <div v-if="item" class="file-root">
    <div class="file-icon" :style="{ color: iconColors[iconType] }">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span class="file-ext">{{ iconType.toUpperCase() }}</span>
    </div>

    <div class="file-info">
      <p class="file-name">{{ item.content.fileName }}</p>
      <p v-if="item.content.fileSize" class="file-size">{{ formatSize(item.content.fileSize) }}</p>
    </div>

    <a
      v-if="signedUrl"
      :href="signedUrl"
      target="_blank"
      rel="noopener"
      class="file-download"
      title="Download"
      @click.stop
      @pointerdown.stop
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </a>
  </div>
</template>

<style scoped>
.file-root {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  box-sizing: border-box;
  overflow: hidden;
}

.file-icon {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-ext {
  position: absolute;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.03em;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: #9CA3AF;
  margin: 0;
}

.file-download {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #6B7280;
  background: #F9FAFB;
  transition: background 0.1s, color 0.1s;
}
.file-download:hover { background: #EFF6FF; color: #3B82F6; }
</style>
