import { shallowRef } from 'vue';

const pipWindow = shallowRef<any>(null);

export const usePiPWindow = () => {
    const isPipAvailable = typeof window !== 'undefined' && "documentPictureInPicture" in window;

    const close = () => {
        if (pipWindow.value) {
            pipWindow.value.close();
            pipWindow.value = null;
        }
    };

    const open = async (url: string, options: { width: number; height: number, id: string; boardId: string }) => {
        if (!isPipAvailable) return;

        if (pipWindow.value && pipWindow.value.closed) {
            pipWindow.value = null;
        }

        if (pipWindow.value) {
            // Window is already open, send message to append
            console.log("Window is already open, sending append message");

            try {
                pipWindow.value.resizeBy(0, options.height);
            } catch (e) {
                console.warn("Failed to resize PiP window:", e);
            }

            const iframe = pipWindow.value.document.querySelector("iframe");
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: "append",
                    id: options.id
                }, "*");
            }

            // Bring window to front if possible (browser dependent, often not allowed without user gesture but worth a try or just logic update)
            // Note: window.focus() on pip window often doesn't work as expected for bringing to foreground if not initiated by user gesture.
        } else {
            // Create new PiP window
            try {
                const win = await window.documentPictureInPicture.requestWindow({
                    width: options.width,
                    height: options.height,
                });

                pipWindow.value = win;

                // Copy styles
                // We'll just add basic reset and layout styles for now as per previous implementation
                const style = document.createElement("style");
                style.innerHTML = `
                    * { margin:0; box-sizing: border-box; }
                    html, body { width: 100vw; height: 100vh; overflow: hidden; }
                    body {
                        display: flex;
                        flex-direction: column; 
                        background: #f0f2f5; 
                    }
                    iframe {
                        flex: 1;
                        width: 100%;
                        border: none;
                    }
                `;
                win.document.head.append(style);

                const iframe = document.createElement("iframe");
                iframe.src = url;
                win.document.body.append(iframe);

                // Handle closing
                win.addEventListener("pagehide", () => {
                    pipWindow.value = null;
                });
            } catch (err) {
                console.error("Failed to open PiP window:", err);
            }
        }
    };


    return {
        isPipAvailable,
        pipWindow,
        open,
        close
    };
};
