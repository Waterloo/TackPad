/**
 * Document Picture-in-Picture API composable.
 *
 * Opens a detached PiP window for a board item.
 * Falls back to a regular popup on browsers without Document PiP (Safari/Firefox).
 *
 * Usage:
 *   const { openPip, closePip, isOpen } = usePiPWindow()
 *   openPip(boardId, itemId, width, height)
 */

// Module-level so state is shared across all component instances
const pipWindow     = shallowRef<Window | null>(null)
const openedWidgets = ref<string[]>([])

export function usePiPWindow() {
  const isOpen = computed(() => !!pipWindow.value && !pipWindow.value.closed)

  async function openPip(boardId: string, itemId: string, itemWidth = 240, itemHeight = 200) {
    // Don't open the same widget twice
    if (openedWidgets.value.includes(itemId)) return

    const url  = `/pip/${boardId}/${itemId}`
    const winW = itemWidth
    const winH = itemHeight

    // ── Document PiP (Chrome 116+) ──────────────────────────────────────
    if ('documentPictureInPicture' in window) {
      try {
        // If a PiP window is already open, resize it and inject another iframe
        if (pipWindow.value && !pipWindow.value.closed) {
          const extraWidth = openedWidgets.value.length === 1 ? 32 : 0
          pipWindow.value.resizeBy(extraWidth, winH)
          _appendIframe(pipWindow.value, url)
          openedWidgets.value.push(itemId)
          return
        }

        const pip = await (window as any).documentPictureInPicture.requestWindow({
          width: winW,
          height: winH,
          preferInitialWindowPlacement: true,
        })
        pipWindow.value = pip

        // Ensure html + body fill the window so iframe height:100% works
        pip.document.documentElement.style.cssText = 'height:100%;margin:0;padding:0;'
        pip.document.body.style.cssText            = 'margin:0;padding:0;height:100%;overflow:hidden;display:flex;flex-direction:column;'

        _appendIframe(pip, url)
        openedWidgets.value.push(itemId)

        pip.addEventListener('pagehide', () => {
          pipWindow.value     = null
          openedWidgets.value = []
        })
        return
      }
      catch (err) {
        console.warn('[pip] documentPictureInPicture failed, falling back', err)
      }
    }

    // ── Popup fallback ────────────────────────────────────────────────────
    const left   = window.screenX + window.outerWidth  - winW - 16
    const top    = window.screenY + window.outerHeight - winH - 16
    const popup  = window.open(
      url,
      `pip-${boardId}`,
      `width=${winW},height=${winH},left=${left},top=${top},resizable=yes,scrollbars=no`,
    )
    if (popup) {
      // resizeTo after open guarantees exact size cross-platform
      popup.resizeTo(winW, winH)
      pipWindow.value = popup
      openedWidgets.value.push(itemId)
      popup.addEventListener('beforeunload', () => {
        pipWindow.value     = null
        openedWidgets.value = []
      })
    }
  }

  function closePip() {
    pipWindow.value?.close()
    pipWindow.value     = null
    openedWidgets.value = []
  }

  onUnmounted(() => {
    // Only close if nothing else is using the pip window
    if (openedWidgets.value.length === 0) closePip()
  })

  return { openPip, closePip, isOpen, openedWidgets: readonly(openedWidgets) }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _appendIframe(win: Window, url: string) {
  const iframe = win.document.createElement('iframe')
  iframe.src = url
  // flex: 1 so stacked iframes share space; min-height 0 prevents overflow
  iframe.style.cssText = 'flex:1;min-height:0;width:100%;border:none;display:block;'
  win.document.body.appendChild(iframe)
}
