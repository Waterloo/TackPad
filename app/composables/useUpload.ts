import { useToast } from 'primevue/usetoast'
import type { BoardItem } from '~/shared/types/board'
import { useWidgetFactory } from '~/composables/widgets/useWidgetFactory'
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import { PREVIEW_LIMIT_BYTES, MAX_UPLOAD_BYTES } from '~~/shared/constants/upload'

interface UploadResponse {
  uploadId: string
  url: string
  fileName: string
  fileType: string
  fileSize: number
}

const IMAGE_WIDGET_MAX_WIDTH = 560
const IMAGE_WIDGET_MAX_HEIGHT = 420
const IMAGE_WIDGET_MIN_LONG_SIDE = 220

function getUploadId(item: BoardItem | undefined): string | null {
  if (!item) return null
  if (item.kind === 'image') return item.content.uploadId ?? null
  if (item.kind === 'audio') return item.content.uploadId ?? null
  if (item.kind === 'file') return item.content.uploadId ?? null
  return null
}

export function useUpload() {
  const toast = useToast()
  const authStore = useAuthStore()
  const boardStore = useBoardStore()
  const factory = useWidgetFactory()

  const isUploading = ref(false)
  const progress = ref(0)

  async function ensureOAuth() {
    const ok = await authStore.requireOAuth()
    if (!ok) {
      toast.add({
        severity: 'info',
        summary: 'Login required',
        detail: 'Upload and voice recording require an OAuth account.',
        life: 2800,
      })
      return false
    }
    return true
  }

  function uploadFile(file: File): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
      const form = new FormData()
      form.append('file', file)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/upload/${boardStore.boardId}`)
      xhr.responseType = 'json'

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          progress.value = Math.max(progress.value, Math.round((e.loaded / e.total) * 100))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          progress.value = 100
          resolve(xhr.response as UploadResponse)
          return
        }
        const message = (xhr.response as any)?.statusMessage || (xhr.response as any)?.message || 'Upload failed'
        reject(new Error(message))
      }
      xhr.onerror = () => reject(new Error('Network error while uploading'))
      xhr.send(form)
    })
  }

  async function getImageWidgetSize(file: File): Promise<{ width: number, height: number } | null> {
    if (!file.type.startsWith('image/')) return null
    const objectUrl = URL.createObjectURL(file)
    try {
      const dimensions = await new Promise<{ width: number, height: number }>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          resolve({
            width: img.naturalWidth || 240,
            height: img.naturalHeight || 200,
          })
        }
        img.onerror = () => reject(new Error('Failed to read image dimensions'))
        img.src = objectUrl
      })

      const sourceWidth = Math.max(1, dimensions.width)
      const sourceHeight = Math.max(1, dimensions.height)
      let scale = Math.min(1, IMAGE_WIDGET_MAX_WIDTH / sourceWidth, IMAGE_WIDGET_MAX_HEIGHT / sourceHeight)
      const scaledLongSide = Math.max(sourceWidth, sourceHeight) * scale
      if (scaledLongSide < IMAGE_WIDGET_MIN_LONG_SIDE) {
        const minLongScale = IMAGE_WIDGET_MIN_LONG_SIDE / Math.max(sourceWidth, sourceHeight)
        scale = Math.min(Math.max(scale, minLongScale), IMAGE_WIDGET_MAX_WIDTH / sourceWidth, IMAGE_WIDGET_MAX_HEIGHT / sourceHeight)
      }

      return {
        width: Math.max(1, Math.round(sourceWidth * scale)),
        height: Math.max(1, Math.round(sourceHeight * scale)),
      }
    }
    catch {
      return null
    }
    finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  async function uploadAndCreate(file: File): Promise<boolean> {
    if (!boardStore.boardId) {
      toast.add({ severity: 'error', summary: 'No board selected', detail: 'Open a board before uploading.', life: 2800 })
      return false
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.add({ severity: 'warn', summary: 'File too large', detail: 'Max upload size is 15MB.', life: 3200 })
      return false
    }

    const oauthOk = await ensureOAuth()
    if (!oauthOk) return false

    isUploading.value = true
    progress.value = 5

    try {
      const imageWidgetSize = file.type.startsWith('image/')
        ? await getImageWidgetSize(file)
        : null
      const uploaded = await uploadFile(file)
      const isImage = uploaded.fileType?.startsWith('image/')
      const isAudio = uploaded.fileType?.startsWith('audio/')
      const canPreview = uploaded.fileSize <= PREVIEW_LIMIT_BYTES

      if (isImage && canPreview) {
        factory.createImage(
          uploaded.url,
          uploaded.fileName,
          undefined,
          {
            uploadId: uploaded.uploadId,
            fileName: uploaded.fileName,
            fileSize: uploaded.fileSize,
            mimeType: uploaded.fileType,
            caption: null,
          },
          imageWidgetSize ?? undefined,
        )
      }
      else if (isAudio && canPreview) {
        factory.createAudio(
          uploaded.url,
          uploaded.fileName,
          {
            uploadId: uploaded.uploadId,
            fileSize: uploaded.fileSize,
            mimeType: uploaded.fileType,
          },
        )
      }
      else {
        factory.createFile(
          uploaded.url,
          uploaded.fileName,
          uploaded.fileType ?? null,
          uploaded.fileSize ?? null,
          { uploadId: uploaded.uploadId },
        )
      }

      await authStore.fetchProfile()
      toast.add({
        severity: 'success',
        summary: 'Uploaded',
        detail: `${uploaded.fileName} added to board.`,
        life: 2200,
      })
      return true
    }
    catch (err: any) {
      toast.add({
        severity: 'error',
        summary: 'Upload failed',
        detail: String(err?.message ?? 'Unable to upload file.'),
        life: 3400,
      })
      return false
    }
    finally {
      isUploading.value = false
      progress.value = 0
    }
  }

  async function deleteUpload(uploadId: string): Promise<boolean> {
    try {
      await $fetch('/api/upload/delete', {
        method: 'POST',
        body: {
          uploadId,
          boardId: boardStore.boardId,
        },
      })
      await authStore.fetchProfile()
      return true
    }
    catch (err: any) {
      toast.add({
        severity: 'error',
        summary: 'Delete failed',
        detail: String(err?.data?.statusMessage ?? err?.message ?? 'Unable to delete uploaded file.'),
        life: 3200,
      })
      return false
    }
  }

  async function deleteItemWithUpload(itemId: string): Promise<boolean> {
    const item = boardStore.items.get(itemId)
    const uploadId = getUploadId(item)
    if (uploadId) {
      const oauthOk = await ensureOAuth()
      if (!oauthOk) return false

      const ok = await deleteUpload(uploadId)
      if (!ok) return false
    }

    boardStore.removeItem(itemId)
    return true
  }

  return {
    isUploading,
    progress,
    uploadAndCreate,
    deleteItemWithUpload,
  }
}
