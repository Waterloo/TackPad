import { shallowRef } from 'vue';

const pipWindow = shallowRef<any>(null);
const openedWidgets = ref<string[]>([]);
const STARTING_MINIMUM_WIDTH = 360;
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

        if (openedWidgets.value.includes(options.id)) return;

        if (pipWindow.value && pipWindow.value.closed) {
            pipWindow.value = null;
        }

        if (pipWindow.value) {
            // Window is already open, send message to append
            console.log("Window is already open, sending append message");

            try {
                // adjustment for added padding when more than one item is present
                const width = openedWidgets.value.length == 1 ? 32 : 0;
                pipWindow.value.resizeBy(width, options.height);
            } catch (e) {
                console.warn("Failed to resize PiP window:", e);
            }

            const iframe = pipWindow.value.document.querySelector("iframe");
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: "append",
                    id: options.id
                }, "*");
                openedWidgets.value.push(options.id);
            }
        } else {
            // Create new PiP window
            try {
                const win = await window.documentPictureInPicture.requestWindow({
                    width: (options.width > STARTING_MINIMUM_WIDTH) ? options.width : STARTING_MINIMUM_WIDTH,
                    height: options.height,
                    preferInitialWindowPlacement: true
                });

                pipWindow.value = win;

                const iframe = document.createElement("iframe");
                iframe.src = url;
                iframe.style.width = "100vw";
                iframe.style.height = "100vh";
                iframe.style.border = "none";
                win.document.body.append(iframe);
                // Ensure body has no margin/padding
                win.document.body.style.margin = "0";

                win.resizeTo(options.width, options.height);
                openedWidgets.value.push(options.id);

                // Handle closing
                win.addEventListener("pagehide", () => {
                    pipWindow.value = null;
                    openedWidgets.value = [];
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
