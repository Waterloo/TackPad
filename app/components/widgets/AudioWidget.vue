<script setup lang="ts">
import WaveSurfer from 'wavesurfer.js'
import { useBoardStore } from '~/stores/board'
import type { AudioWidget } from '~/shared/types/board'
import { useSignedUploadUrl } from '~/composables/useSignedUploadUrl'

const props = defineProps<{ itemId: string }>()
const boardStore = useBoardStore()
const item = computed(() => boardStore.items.get(props.itemId) as AudioWidget | undefined)
const uploadId = computed(() => item.value?.content.uploadId ?? null)
const fallbackUrl = computed(() => item.value?.content.url ?? '')
const { signedUrl, refreshSignedUrl } = useSignedUploadUrl(uploadId, fallbackUrl)

const waveformRef = ref<HTMLDivElement | null>(null)
let ws: WaveSurfer | null = null

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const isReady = ref(false)

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function initWaveform(url: string) {
  if (!waveformRef.value || !url) return
  ws?.destroy()
  ws = null
  ws = WaveSurfer.create({
    container: waveformRef.value,
    waveColor: '#D1D5DB',
    progressColor: '#3B82F6',
    height: 40,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    interact: true,
    url,
  })
  ws.on('ready', () => { isReady.value = true; duration.value = ws!.getDuration() })
  ws.on('timeupdate', (t) => { currentTime.value = t })
  ws.on('play', () => { isPlaying.value = true })
  ws.on('pause', () => { isPlaying.value = false })
  ws.on('finish', () => { isPlaying.value = false; currentTime.value = 0 })
  ws.on('error', () => {
    isReady.value = false
    void refreshSignedUrl(true)
  })
}

watch([waveformRef, signedUrl], ([el, url]) => {
  if (!el || !url) return
  isReady.value = false
  currentTime.value = 0
  duration.value = 0
  initWaveform(url)
}, { immediate: true })

onUnmounted(() => ws?.destroy())

function togglePlay() { ws?.playPause() }
</script>

<template>
  <div v-if="item" class="audio-root">
    <div class="audio-left">
      <button class="play-btn" :disabled="!isReady" @click.stop="togglePlay">
        <svg v-if="!isPlaying" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
        </svg>
      </button>
    </div>

    <div class="audio-right">
      <p class="audio-name">{{ item.content.fileName || 'Audio' }}</p>
      <p v-if="item.content.fileSize" class="audio-meta">{{ (item.content.fileSize / (1024 * 1024)).toFixed(1) }} MB</p>
      <div ref="waveformRef" class="waveform" />
      <div class="audio-time">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-root {
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

.play-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #3B82F6;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: filter 0.1s;
}
.play-btn:hover { filter: brightness(1.1); }
.play-btn:disabled { background: #E5E7EB; color: #9CA3AF; cursor: default; }

.audio-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.audio-name {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-meta {
  font-size: 10px;
  margin: 0;
  color: #9CA3AF;
}

.waveform { flex: 1; }

.audio-time {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #9CA3AF;
  font-variant-numeric: tabular-nums;
}
</style>
