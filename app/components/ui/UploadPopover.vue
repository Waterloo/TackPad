<script setup lang="ts">
import { useUpload } from '~/composables/useUpload'

const visible = defineModel<boolean>('visible', { default: false })
const { uploadAndCreate, isUploading, progress } = useUpload()

const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function openPicker() {
  if (isUploading.value) return
  fileInputRef.value?.click()
}

async function onFiles(files: FileList | null) {
  if (!files || files.length === 0) return
  const file = files[0]!
  const ok = await uploadAndCreate(file)
  if (ok) visible.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  void onFiles(e.dataTransfer?.files ?? null)
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  void onFiles(target.files)
  target.value = ''
}
</script>

<template>
  <Teleport to="body">
    <Transition name="up-fade">
      <div v-if="visible" class="up-overlay" @click.self="visible = false">
        <div class="up-panel">
          <div class="up-header">
            <h3>Upload file</h3>
            <button class="up-close" @click="visible = false">Close</button>
          </div>

          <div
            class="up-drop"
            :class="{ 'up-drop--on': dragOver, 'up-drop--disabled': isUploading }"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop="onDrop"
          >
            <p class="up-title">Drop file here</p>
            <p class="up-sub">or</p>
            <button class="up-choose" :disabled="isUploading" @click="openPicker">
              {{ isUploading ? 'Uploading...' : 'Choose file' }}
            </button>
            <input
              ref="fileInputRef"
              type="file"
              class="up-input"
              @change="onFileChange"
            >
          </div>

          <div v-if="isUploading" class="up-progress-wrap">
            <div class="up-progress-bar" :style="{ width: `${progress}%` }" />
          </div>
          <div class="up-rules">
            <span>Max file size: 15MB</span>
            <span>Image/audio preview only up to 5MB</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.up-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.26);
}

.up-panel {
  width: 420px;
  max-width: calc(100vw - 24px);
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
  padding: 14px;
}

.up-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.up-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  color: #111827;
}

.up-close {
  border: none;
  background: #F3F4F6;
  color: #374151;
  border-radius: 8px;
  height: 30px;
  padding: 0 10px;
  cursor: pointer;
}

.up-drop {
  border: 2px dashed #D1D5DB;
  border-radius: 12px;
  min-height: 184px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #FAFAFA;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.up-drop--on {
  border-color: #3B82F6;
  background: #EFF6FF;
}

.up-drop--disabled {
  opacity: 0.7;
  pointer-events: none;
}

.up-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.up-sub {
  margin: 0;
  color: #6B7280;
  font-size: 12px;
}

.up-choose {
  border: none;
  border-radius: 8px;
  height: 34px;
  padding: 0 12px;
  color: #fff;
  background: #2563EB;
  font-weight: 600;
  cursor: pointer;
}

.up-input {
  display: none;
}

.up-progress-wrap {
  margin-top: 12px;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #E5E7EB;
  overflow: hidden;
}

.up-progress-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2563EB, #3B82F6);
  transition: width 0.15s ease;
}

.up-rules {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #6B7280;
  font-size: 11px;
}

.up-fade-enter-active,
.up-fade-leave-active {
  transition: opacity 0.16s ease;
}
.up-fade-enter-from,
.up-fade-leave-to {
  opacity: 0;
}
</style>
