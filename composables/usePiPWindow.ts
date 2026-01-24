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
        } else {
            // Create new PiP window
            try {
                const win = await window.documentPictureInPicture.requestWindow({
                    width: options.width,
                    height: options.height,
                });

                pipWindow.value = win;

                // Copy all styles from main window
                [...document.styleSheets].forEach((styleSheet) => {
                    try {
                        const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
                        const style = document.createElement("style");
                        style.textContent = cssRules;
                        win.document.head.appendChild(style);
                    } catch (e) {
                        const link = document.createElement("link");
                        link.rel = "stylesheet";
                        link.type = styleSheet.type;
                        link.media = styleSheet.media.toString();
                        link.href = styleSheet.href || "";
                        win.document.head.appendChild(link);
                    }
                });

                // Copy all style tags
                Array.from(document.querySelectorAll('style')).forEach(styleTag => {
                    win.document.head.appendChild(styleTag.cloneNode(true));
                });

                // Copy all link stylesheets
                Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(linkTag => {
                    win.document.head.appendChild(linkTag.cloneNode(true));
                });


                const iframe = document.createElement("iframe");
                iframe.src = url;
                iframe.style.width = "100vw";
                iframe.style.height = "100vh";
                iframe.style.border = "none";
                win.document.body.append(iframe);
                // Ensure body has no margin/padding
                win.document.body.style.margin = "0";

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
