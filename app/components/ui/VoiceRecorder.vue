<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import { useUpload } from '~/composables/useUpload'

const visible = defineModel<boolean>('visible', { default: false })
const toast = useToast()
const { uploadAndCreate, isUploading } = useUpload()

const status = ref<'idle' | 'recording' | 'preview' | 'processing'>('idle')
const elapsed = ref(0)
const stream = ref<MediaStream | null>(null)
const previewUrl = ref<string | null>(null)
const recordedFile = ref<File | null>(null)
let mediaRecorder: MediaRecorder | null = null
let timer: ReturnType<typeof setInterval> | null = null
let chunks: Blob[] = []

const canStart = computed(() => (status.value === 'idle' || status.value === 'preview') && !isUploading.value)
const canStop = computed(() => status.value === 'recording')

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

async function startRecording() {
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream.value)
    chunks = []
    elapsed.value = 0
    status.value = 'recording'

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }

    mediaRecorder.start()
    timer = setInterval(() => { elapsed.value += 1 }, 1000)
  }
  catch {
    toast.add({
      severity: 'error',
      summary: 'Microphone blocked',
      detail: 'Allow microphone access to record audio.',
      life: 3200,
    })
  }
}

async function stopRecording() {
  if (!mediaRecorder) return
  status.value = 'processing'
  mediaRecorder.stop()
  if (timer) { clearInterval(timer); timer = null }

  await new Promise<void>((resolve) => {
    if (!mediaRecorder) return resolve()
    mediaRecorder.onstop = () => resolve()
  })

  const mimeType = chunks[0]?.type || 'audio/webm'
  const blob = new Blob(chunks, { type: mimeType })
  const ext = mimeType.includes('ogg') ? 'ogg' : (mimeType.includes('mp4') ? 'm4a' : 'webm')
  const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType })
  recordedFile.value = file
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(blob)
  cleanupStreamOnly()
  status.value = 'preview'
}

async function uploadRecording() {
  if (!recordedFile.value) return
  status.value = 'processing'
  const ok = await uploadAndCreate(recordedFile.value)
  if (ok) {
    resetAll()
    visible.value = false
    return
  }
  status.value = 'preview'
}

function reRecord() {
  resetRecordingData()
  status.value = 'idle'
}

function cleanupStreamOnly() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (stream.value) {
    for (const track of stream.value.getTracks()) track.stop()
    stream.value = null
  }
  mediaRecorder = null
  chunks = []
}

function resetRecordingData() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  recordedFile.value = null
  elapsed.value = 0
}

function resetAll() {
  cleanupStreamOnly()
  resetRecordingData()
  status.value = 'idle'
}

watch(visible, (open) => {
  if (!open) {
    resetAll()
  }
})

onUnmounted(resetAll)
</script>

<template>
  <Teleport to="body">
    <Transition name="vr-fade">
      <div v-if="visible" class="vr-overlay" @click.self="visible = false">
        <div class="vr-panel">
          <h3>Voice recorder</h3>
          <p class="vr-sub">Record in-app and upload as audio.</p>

          <div class="vr-clock">{{ fmtTime(elapsed) }}</div>

          <audio v-if="previewUrl" class="vr-audio" :src="previewUrl" controls />

          <div class="vr-actions">
            <button class="vr-btn vr-btn--primary" :disabled="!canStart" @click="startRecording">
              Start
            </button>
            <button class="vr-btn vr-btn--danger" :disabled="!canStop" @click="stopRecording">
              Stop
            </button>
          </div>

          <div v-if="status === 'preview'" class="vr-actions">
            <button class="vr-btn vr-btn--light" @click="reRecord">Record again</button>
            <button class="vr-btn vr-btn--primary" :disabled="isUploading" @click="uploadRecording">
              {{ isUploading ? 'Uploading...' : 'Upload recording' }}
            </button>
          </div>

          <p class="vr-status">
            <span v-if="status === 'idle'">Ready</span>
            <span v-else-if="status === 'recording'">Recording...</span>
            <span v-else-if="status === 'preview'">Preview and confirm before upload.</span>
            <span v-else>Processing...</span>
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vr-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.26);
}

.vr-panel {
  width: 360px;
  max-width: calc(100vw - 24px);
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
  padding: 18px;
}

.vr-panel h3 {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.vr-sub {
  margin: 6px 0 14px;
  color: #6B7280;
  font-size: 12px;
}

.vr-clock {
  width: 100%;
  border-radius: 10px;
  background: #F3F4F6;
  color: #111827;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: center;
  padding: 12px 0;
  font-variant-numeric: tabular-nums;
}

.vr-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.vr-audio {
  width: 100%;
  margin-top: 14px;
}

.vr-btn {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.vr-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.vr-btn--primary {
  color: #fff;
  background: #2563EB;
}

.vr-btn--danger {
  color: #fff;
  background: #DC2626;
}

.vr-btn--light {
  color: #111827;
  background: #E5E7EB;
}

.vr-status {
  margin: 10px 0 0;
  font-size: 12px;
  color: #6B7280;
}

.vr-fade-enter-active,
.vr-fade-leave-active {
  transition: opacity 0.16s ease;
}
.vr-fade-enter-from,
.vr-fade-leave-to {
  opacity: 0;
}
</style>
