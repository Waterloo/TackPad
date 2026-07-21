<script setup lang="ts">
import { useBoardStore } from '~/stores/board'
import type { LinkItem } from '~/shared/types/board'

const props = defineProps<{ itemId: string }>()
const boardStore = useBoardStore()
const item = computed(() => boardStore.items.get(props.itemId) as LinkItem | undefined)

const isEditingUrl = ref(false)
const urlDraft = ref('')
const urlInput = ref<HTMLInputElement | null>(null)
const isFetching = ref(false)

// AbortController for the in-flight metadata fetch.
// Replaced on each new fetchMeta call so stale responses are discarded.
let _fetchAbort: AbortController | null = null

// Auto-fetch metadata when URL is set without metadata
onMounted(() => {
  if (item.value?.content.url && !item.value.content.title) {
    fetchMeta(item.value.content.url)
  }
})

onUnmounted(() => { _fetchAbort?.abort() })

async function fetchMeta(url: string) {
  if (!url) return
  // Cancel any in-flight request before starting a new one
  _fetchAbort?.abort()
  _fetchAbort = new AbortController()
  const { signal } = _fetchAbort

  isFetching.value = true
  try {
    const meta = await $fetch<{ title: string | null, description: string | null, image: string | null, oEmbed: string | null }>(
      '/api/metadata', { params: { url }, signal },
    )
    if (!item.value) return
    boardStore.updateItem(props.itemId, {
      content: { ...item.value.content, url, ...meta },
    })
  }
  catch { /* leave as-is (includes AbortError on cancel) */ }
  finally { isFetching.value = false }
}

function startEditUrl() {
  if (item.value?.lock) return
  urlDraft.value = item.value?.content.url ?? ''
  isEditingUrl.value = true
  nextTick(() => { urlInput.value?.focus(); urlInput.value?.select() })
}

async function commitUrl() {
  isEditingUrl.value = false
  const url = urlDraft.value.trim()
  if (!url || !item.value) return
  // Optimistically update URL, then fetch metadata
  boardStore.updateItem(props.itemId, {
    content: { url, title: null, description: null, image: null, oEmbed: null },
  })
  await fetchMeta(url)
}

function onUrlKey(e: KeyboardEvent) {
  if (e.key === 'Enter') commitUrl()
  if (e.key === 'Escape') isEditingUrl.value = false
}

const domain = computed(() => {
  try { return new URL(item.value?.content.url ?? '').hostname.replace('www.', '') }
  catch { return item.value?.content.url ?? '' }
})
</script>

<template>
  <div v-if="item" class="link-root">
    <!-- oEmbed embed -->
    <div
      v-if="item.content.oEmbed"
      class="oembed-wrap"
      v-html="item.content.oEmbed"
    />

    <!-- Standard OG card -->
    <template v-else>
      <div v-if="item.content.image" class="link-image-wrap">
        <img :src="item.content.image" :alt="item.content.title ?? ''" class="link-image" />
      </div>

      <div class="link-body">
        <div v-if="isFetching" class="link-loading">
          <div class="skeleton skeleton-title" />
          <div class="skeleton skeleton-desc" />
        </div>
        <template v-else>
          <p class="link-title">{{ item.content.title || domain }}</p>
          <p v-if="item.content.description" class="link-desc">{{ item.content.description }}</p>
        </template>

        <!-- URL row -->
        <div class="link-url-row">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <input
            v-if="isEditingUrl"
            ref="urlInput"
            v-model="urlDraft"
            class="url-input"
            placeholder="https://…"
            @blur="commitUrl"
            @keydown="onUrlKey"
            @click.stop
            @pointerdown.stop
          />
          <span
            v-else
            class="url-text"
            :title="item.content.url"
            @dblclick.stop="startEditUrl"
          >{{ domain || 'Double click to edit' }}</span>
          <a
            v-if="item.content.url && !isEditingUrl"
            :href="item.content.url"
            target="_blank"
            rel="noopener noreferrer"
            class="link-open"
            @click.stop
            @pointerdown.stop
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.link-root {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: inherit;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.oembed-wrap {
  width: 100%;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
}
.oembed-wrap :deep(iframe) { width: 100%; height: 100%; border: 0; border-radius: 8px; }

.link-image-wrap {
  flex-shrink: 0;
  height: 90px;
  overflow: hidden;
}

.link-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.link-body {
  flex: 1;
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.link-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link-desc {
  font-size: 11px;
  color: #6B7280;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.link-url-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: auto;
  color: #9CA3AF;
}

.url-text {
  font-size: 11px;
  color: #9CA3AF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  cursor: text;
}

.url-input {
  flex: 1;
  font-size: 11px;
  color: #374151;
  border: none;
  outline: none;
  background: transparent;
  padding: 0;
}

.link-open {
  color: #9CA3AF;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.1s;
}
.link-open:hover { color: #3B82F6; }

/* Loading skeletons */
.skeleton {
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
.skeleton-title { height: 13px; width: 80%; margin-bottom: 6px; }
.skeleton-desc  { height: 11px; width: 60%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
