import type { TackletChildMethods, TackletParentMethods } from '~/shared/types/board'
import { unref, type MaybeRef } from 'vue'

type BridgeRequestMessage = {
  __tackletBridge: 1
  channelId: string
  type: 'request'
  id: string
  method: string
  params: unknown[]
}

type BridgeResponseMessage = {
  __tackletBridge: 1
  channelId: string
  type: 'response'
  id: string
  ok: boolean
  result?: unknown
  error?: string
}

type BridgeReadyMessage = {
  __tackletBridge: 1
  channelId: string
  type: 'ready'
}

type BridgeMessage = BridgeRequestMessage | BridgeResponseMessage | BridgeReadyMessage

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (err: unknown) => void
}

const BRIDGE_MARK = 1
const BRIDGE_TIMEOUT_MS = 8000

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function isBridgeMessage(value: unknown): value is BridgeMessage {
  if (!isObject(value)) return false
  return value.__tackletBridge === BRIDGE_MARK
}

function getMethodName(value: unknown): string | null {
  if (!isObject(value)) return null
  if (typeof value.method === 'string') return value.method
  if (typeof value.action === 'string') return value.action
  if (typeof value.event === 'string') return value.event
  if (typeof value.type === 'string') {
    const type = value.type.toLowerCase()
    if (type.includes('connect')) return 'connect'
    if (type.includes('setdata')) return 'setData'
    if (type.includes('getdata')) return 'getData'
    if (type.includes('register')) return 'registerWidget'
  }
  return null
}

function isConnectLike(method: string): boolean {
  const m = method.toLowerCase()
  return m === 'connect'
    || m === 'register'
    || m === 'registerwidget'
    || m === 'tackpad:connect'
    || m === 'tacklet:connect'
}

function nextRequestId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function useTackletBridge(options: {
  channelId: string
  iframeRef: Ref<HTMLIFrameElement | null>
  expectedOrigin: MaybeRef<string>
  strictOrigin?: MaybeRef<boolean>
  parentMethods: TackletParentMethods
  timeoutMs?: number
}) {
  const isConnected = ref(false)
  const lastError = ref<string | null>(null)
  const remote = shallowRef<TackletChildMethods | null>(null)

  const pending = new Map<string, PendingRequest>()
  let removeListener: (() => void) | null = null
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  function markConnected() {
    if (isConnected.value) return
    isConnected.value = true
    lastError.value = null
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
      timeoutHandle = null
    }
  }

  function postMessageToChild(message: BridgeMessage) {
    const frame = options.iframeRef.value
    const target = frame?.contentWindow
    const strictOrigin = unref(options.strictOrigin ?? true)
    const targetOrigin = strictOrigin ? unref(options.expectedOrigin) : '*'
    if (strictOrigin && !targetOrigin) return false
    if (!target) return false
    target.postMessage(message, targetOrigin)
    return true
  }

  function postAnyToChild(message: unknown) {
    const frame = options.iframeRef.value
    const target = frame?.contentWindow
    const strictOrigin = unref(options.strictOrigin ?? true)
    const targetOrigin = strictOrigin ? unref(options.expectedOrigin) : '*'
    if ((strictOrigin && !targetOrigin) || !target) return false
    target.postMessage(message, targetOrigin)
    return true
  }

  function resolveParentMethod(method: string): ((...args: unknown[]) => unknown) | null {
    const normalized = method.toLowerCase()
    if (normalized === 'getwidgetdata' || normalized === 'getdata') return options.parentMethods.getWidgetData
    if (normalized === 'setwidgetdata' || normalized === 'setdata') {
      return (...args: unknown[]) => {
        // Legacy contract: setWidgetData(id, data)
        // New contract: setWidgetData(data)
        if (args.length >= 2 && typeof args[0] === 'string') {
          return options.parentMethods.setWidgetData(args[1] as Record<string, unknown>)
        }
        return options.parentMethods.setWidgetData(args[0] as Record<string, unknown>)
      }
    }
    if (normalized === 'widgetinteraction') {
      return (...args: unknown[]) => {
        const action = typeof args[0] === 'string' ? args[0] : 'interaction'
        const payload = args[1]
        // Keep compatibility with old parent contract; selection is still
        // handled separately, this is a no-op signal channel today.
        console.debug('[tacklet] widget_interaction', {
          channelId: options.channelId,
          action,
          payload,
        })
        return { ok: true }
      }
    }
    if (normalized === 'getwidgetid' || normalized === 'getid' || normalized === 'widgetid') return options.parentMethods.getWidgetId
    if (normalized === 'gettheme') return options.parentMethods.getTheme
    if (normalized === 'getboardcontext' || normalized === 'getcontext') return options.parentMethods.getBoardContext
    if (normalized === 'registerwidget' || normalized === 'register' || normalized === 'connect') return options.parentMethods.registerWidget
    if (normalized === 'onresize') return options.parentMethods.onResize ?? null
    return options.parentMethods[method as keyof TackletParentMethods] as ((...args: unknown[]) => unknown) | null
  }

  async function replyLegacy(eventData: Record<string, unknown>, ok: boolean, payload: unknown, error?: string) {
    const id = eventData.id ?? eventData.requestId ?? eventData.reqId
    const type = typeof eventData.type === 'string' ? eventData.type : null
    const base: Record<string, unknown> = {
      ok,
      success: ok,
      result: ok ? payload : undefined,
      data: ok ? payload : undefined,
      payload: ok ? payload : undefined,
      error: ok ? undefined : (error ?? 'Request failed'),
      id,
      requestId: id,
      channelId: options.channelId,
      node_id: options.channelId,
    }
    postAnyToChild({
      ...base,
      type: type ? `${type}:response` : 'response',
    })
    postAnyToChild({
      ...base,
      type: 'response',
    })
  }

  function sendLegacyConnected(eventData: Record<string, unknown>) {
    const id = eventData.id ?? eventData.requestId ?? eventData.reqId
    const connectedPayload = {
      ok: true,
      success: true,
      connected: true,
      id,
      requestId: id,
      channelId: options.channelId,
      node_id: options.channelId,
      apiVersion: '2.0.0-v1-compatible',
    }
    // Emit multiple common ack forms for backward compatibility.
    postAnyToChild({ type: 'connected', ...connectedPayload })
    postAnyToChild({ type: 'connect:response', ...connectedPayload })
    postAnyToChild({ type: 'tackpad:connected', ...connectedPayload })
    postAnyToChild({ type: 'tacklet:connected', ...connectedPayload })
    postAnyToChild({ type: 'TACKPAD_CONNECTED', ...connectedPayload })
    postAnyToChild({ event: 'connected', ...connectedPayload })
  }

  async function callRemote(method: keyof TackletChildMethods, ...params: unknown[]) {
    const id = nextRequestId()
    const request: BridgeRequestMessage = {
      __tackletBridge: BRIDGE_MARK,
      channelId: options.channelId,
      type: 'request',
      id,
      method: String(method),
      params,
    }
    if (!postMessageToChild(request)) throw new Error('Bridge target unavailable')
    return await new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
    })
  }

  async function onMessage(event: MessageEvent) {
    const frame = options.iframeRef.value
    if (!frame?.contentWindow) return
    if (event.source !== frame.contentWindow) return
    const strictOrigin = unref(options.strictOrigin ?? true)
    const targetOrigin = unref(options.expectedOrigin)
    if (strictOrigin && event.origin !== targetOrigin) {
      console.warn('[tacklet] bridge_origin_mismatch', {
        channelId: options.channelId,
        expectedOrigin: targetOrigin,
        actualOrigin: event.origin,
      })
      return
    }
    if (isBridgeMessage(event.data)) {
      if (event.data.channelId !== options.channelId) return

      if (event.data.type === 'ready') {
        markConnected()
        remote.value = {
          onSelected: async () => { await callRemote('onSelected') },
          onDeselected: async () => { await callRemote('onDeselected') },
          onResize: async (width: number, height: number) => { await callRemote('onResize', width, height) },
        }
        return
      }

      if (event.data.type === 'response') {
        markConnected()
        const waiter = pending.get(event.data.id)
        if (!waiter) return
        pending.delete(event.data.id)
        if (event.data.ok) waiter.resolve(event.data.result)
        else waiter.reject(new Error(event.data.error || 'Bridge call failed'))
        return
      }

      const { id, method, params } = event.data
      markConnected()
      const fn = resolveParentMethod(method)
      if (!fn) {
        postMessageToChild({
          __tackletBridge: BRIDGE_MARK,
          channelId: options.channelId,
          type: 'response',
          id,
          ok: false,
          error: `Unknown method: ${method}`,
        })
        return
      }

      try {
        const result = await fn(...(params ?? []))
        postMessageToChild({
          __tackletBridge: BRIDGE_MARK,
          channelId: options.channelId,
          type: 'response',
          id,
          ok: true,
          result,
        })
      }
      catch (err: any) {
        postMessageToChild({
          __tackletBridge: BRIDGE_MARK,
          channelId: options.channelId,
          type: 'response',
          id,
          ok: false,
          error: err?.message ?? 'Method failed',
        })
      }
      return
    }

    // Legacy protocol compatibility mode:
    if (!isObject(event.data)) return
    const rawChannel = event.data.channelId ?? event.data.node_id ?? event.data.widgetId
    if (typeof rawChannel === 'string' && rawChannel !== options.channelId) return
    const legacyMethod = getMethodName(event.data)
    if (!legacyMethod) return

    markConnected()
    if (isConnectLike(legacyMethod)) {
      try {
        const registerFn = resolveParentMethod('registerWidget')
        if (registerFn) await registerFn(event.data.payload ?? event.data.params ?? {})
      }
      catch {}
      sendLegacyConnected(event.data)
      return
    }

    const fn = resolveParentMethod(legacyMethod)
    if (!fn) {
      await replyLegacy(event.data, false, null, `Unknown method: ${legacyMethod}`)
      return
    }

    try {
      const params = Array.isArray(event.data.params)
        ? event.data.params
        : (event.data.payload !== undefined ? [event.data.payload] : [])
      const result = await fn(...params)
      await replyLegacy(event.data, true, result)
    }
    catch (err: any) {
      await replyLegacy(event.data, false, null, err?.message ?? 'Method failed')
    }
  }

  function destroy() {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
      timeoutHandle = null
    }
    removeListener?.()
    removeListener = null
    for (const [_, waiter] of pending) waiter.reject(new Error('Bridge destroyed'))
    pending.clear()
    isConnected.value = false
    remote.value = null
  }

  function connect() {
    destroy()
    const listener = (event: MessageEvent) => { void onMessage(event) }
    window.addEventListener('message', listener)
    removeListener = () => window.removeEventListener('message', listener)

    // Kickstart handshake for tacklets that wait for parent hello.
    postMessageToChild({
      __tackletBridge: BRIDGE_MARK,
      channelId: options.channelId,
      type: 'ready',
    })
    // Proactive legacy "connected" broadcasts for SDKs that subscribe to
    // parent events instead of initiating an RPC connect handshake.
    sendLegacyConnected({})

    const timeoutMs = options.timeoutMs ?? BRIDGE_TIMEOUT_MS
    timeoutHandle = setTimeout(() => {
      if (isConnected.value) return
      // Non-blocking timeout: legacy tacklets may not implement bridge handshake.
    }, timeoutMs)
  }

  return { connect, destroy, isConnected, lastError, remote }
}
