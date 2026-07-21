<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBoardStore } from '~/stores/board'
import { useUiStore } from '~/stores/ui'
import { useTackletStore } from '~/stores/tacklet'
import type { Tacklet } from '~/shared/types/board'

const MIN_WIDTH = 160
const MIN_HEIGHT = 120
const MAX_WIDTH = 2400
const MAX_HEIGHT = 1600

const props = defineProps<{ itemId: string; isSelected?: boolean }>()

const boardStore = useBoardStore()
const uiStore = useUiStore()
const tackletStore = useTackletStore()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const { selectedItemIds } = storeToRefs(uiStore)

const iframeRef = ref<HTMLIFrameElement | null>(null)
const iframeNonce = ref(0)
const iframeLoaded = ref(false)
const isConnected = ref(false)
const loadError = ref<string | null>(null)
const childRegisteredVersion = ref<string | null>(null)
const remoteTacklet = shallowRef<any>(null)
let connection: { destroy: () => void; promise: Promise<any> } | null = null

declare global {
  interface Window {
    Penpal?: any
    __tackpadPenpalPromise?: Promise<any>
  }
}

const item = computed(() => boardStore.items.get(props.itemId) as Tacklet | undefined)
const isSelectedByStore = computed(() => selectedItemIds.value.has(props.itemId))
const isSelected = computed(() => props.isSelected ?? isSelectedByStore.value)
const containerType = computed<'board' | 'pip'>(() => route.path.startsWith('/pip/') ? 'pip' : 'board')

const expectedOrigin = computed(() => {
  try { return item.value ? new URL(item.value.content.tackletUrl).origin : '' }
  catch { return '' }
})

const allowlistOrigins = computed<string[]>(() => {
  const configured = runtimeConfig.public.tackletsAllowedOrigins
  if (Array.isArray(configured)) return configured.filter(v => typeof v === 'string')
  if (typeof configured === 'string') {
    return configured
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
  }
  return []
})

const isOriginAllowed = computed(() => {
  if (!expectedOrigin.value) return false
  if (allowlistOrigins.value.length === 0) return true
  return allowlistOrigins.value.includes(expectedOrigin.value)
})

const iframeSrc = computed(() => {
  if (!item.value) return ''
  try {
    const url = new URL(item.value.content.tackletUrl)
    url.searchParams.set('node_id', props.itemId)
    url.searchParams.set('container_type', containerType.value)
    url.searchParams.set('board_id', boardStore.boardId)
    url.searchParams.set('theme', 'light')
    return url.toString()
  }
  catch {
    return ''
  }
})

watch(expectedOrigin, (origin) => {
  if (!origin) {
    loadError.value = 'Invalid tacklet URL'
    return
  }
  if (!isOriginAllowed.value) {
    loadError.value = 'Tacklet origin is not allowlisted'
    console.warn('[tacklet] blocked_origin', { itemId: props.itemId, origin })
    return
  }
  loadError.value = null
}, { immediate: true })

async function loadPenpal() {
  if (window.Penpal) return window.Penpal
  if (window.__tackpadPenpalPromise) return await window.__tackpadPenpalPromise
  window.__tackpadPenpalPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/penpal@^7/dist/penpal.min.js'
    script.async = true
    script.onload = () => resolve(window.Penpal)
    script.onerror = () => reject(new Error('Failed to load Penpal runtime'))
    document.head.appendChild(script)
  })
  return await window.__tackpadPenpalPromise
}

async function setupConnection() {
  teardownConnection()
  if (!iframeRef.value?.contentWindow || !item.value || loadError.value) return
  try {
    const Penpal = await loadPenpal()
    const allowedOrigins = allowlistOrigins.value.length > 0
      ? [expectedOrigin.value]
      : ['*']
    const messenger = new Penpal.WindowMessenger({
      remoteWindow: iframeRef.value.contentWindow,
      allowedOrigins,
    })
    connection = Penpal.connect({
      messenger,
      channel: props.itemId,
      methods: {
        getWidgetData: () => JSON.parse(JSON.stringify(item.value?.content.data ?? {})),
        registerWidget: (payload?: { apiVersion?: string; capabilities?: string[] }) => {
          childRegisteredVersion.value = payload?.apiVersion || null
          return { ok: true, apiVersion: '2.0.0-v1-compatible' }
        },
        // Legacy signature compatibility: setWidgetData(id, data)
        setWidgetData: (idOrData: unknown, maybeData?: unknown) => {
          const data = (typeof idOrData === 'string' && maybeData !== undefined)
            ? maybeData
            : idOrData
          return tackletStore.updateTackletData(props.itemId, data)
        },
        widgetInteraction: (_action?: string, _data?: unknown) => {
          // Legacy tacklet contract: any widget interaction should mark this
          // board item as selected in the parent store.
          uiStore.selectItem(props.itemId)
          return { ok: true }
        },
        getWidgetId: () => props.itemId,
        getTheme: () => 'light',
        getBoardContext: () => ({
          boardId: boardStore.boardId,
          canEdit: boardStore.canEdit !== 'unauthorized',
          accessLevel: boardStore.accessLevel,
          containerType: containerType.value,
        }),
        onResize: (width: number, height: number) => {
          const nextWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(width)))
          const nextHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(height)))
          boardStore.updateItem(props.itemId, { width: nextWidth, height: nextHeight } as Partial<Tacklet>)
          return { ok: true }
        },
      },
    })
    remoteTacklet.value = await connection.promise
    isConnected.value = true
  }
  catch (err: any) {
    loadError.value = err?.message || 'Failed to connect to tacklet'
    console.warn('[tacklet] penpal_connection_failed', { itemId: props.itemId, err })
  }
}

function teardownConnection() {
  isConnected.value = false
  remoteTacklet.value = null
  connection?.destroy()
  connection = null
}

watch(isSelected, async (selected) => {
  if (!isConnected.value || !remoteTacklet.value) return
  try {
    if (selected) await remoteTacklet.value.onSelected?.()
    else await remoteTacklet.value.onDeselected?.()
  }
  catch (err) {
    console.warn('[tacklet] selection_event_failed', { itemId: props.itemId, selected, err })
  }
}, { immediate: true })

watch(item, async (next, prev) => {
  if (!isConnected.value || !remoteTacklet.value || !next || !prev) return
  if (next.width === prev.width && next.height === prev.height) return
  try {
    await remoteTacklet.value.onResize?.(next.width, next.height)
  }
  catch (err) {
    console.warn('[tacklet] resize_notify_failed', { itemId: props.itemId, err })
  }
})

function onIframeLoad() {
  iframeLoaded.value = true
  if (loadError.value || !isOriginAllowed.value) return
  void setupConnection()
}

function onIframeError() {
  loadError.value = 'Failed to load tacklet iframe'
  console.warn('[tacklet] iframe_load_error', { itemId: props.itemId, src: iframeSrc.value })
}

function retry() {
  loadError.value = null
  iframeLoaded.value = false
  teardownConnection()
  iframeNonce.value += 1
}

onMounted(() => {
  if (!item.value) loadError.value = 'Missing tacklet item'
})

onUnmounted(() => {
  teardownConnection()
})
</script>

<template>
  <div class="tacklet-root">
    <template v-if="!item || loadError || !isOriginAllowed">
      <div class="tacklet-state tacklet-state--error">
        <strong>Tacklet unavailable</strong>
        <span>{{ loadError || 'Invalid or blocked tacklet origin' }}</span>
        <button type="button" @click="retry">Retry</button>
      </div>
    </template>

    <template v-else>
      <iframe
        :key="iframeNonce"
        ref="iframeRef"
        class="tacklet-frame"
        :src="iframeSrc"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        allow="fullscreen; microphone; camera"
        referrerpolicy="strict-origin-when-cross-origin"
        loading="lazy"
        @load="onIframeLoad"
        @error="onIframeError"
      />

      <div v-if="!iframeLoaded" class="tacklet-state tacklet-state--loading">
        <span class="spinner" />
        <span>{{ loadError || 'Loading widget...' }}</span>
      </div>

      <div v-if="childRegisteredVersion" class="tacklet-badge">API {{ childRegisteredVersion }}</div>
    </template>
  </div>
</template>

<style scoped>
.tacklet-root {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  position: relative;
  background: #fff;
}

.tacklet-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.tacklet-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  text-align: center;
  font-size: 12px;
}

.tacklet-state--loading {
  background: rgba(255, 255, 255, 0.82);
  color: #6b7280;
}

.tacklet-state--error {
  background: #fff7ed;
  color: #9a3412;
}

.tacklet-state button {
  border: 1px solid rgba(154, 52, 18, 0.2);
  background: #fff;
  color: #9a3412;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
}

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  animation: spin 0.7s linear infinite;
}

.tacklet-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  background: rgba(17, 24, 39, 0.75);
  color: #fff;
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 10px;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
