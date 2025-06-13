import { useBoardStore } from "~/stores/board";
import { useItemManagement } from "./useItemManagement";
import { useNoteStore } from "~/stores/noteStore";
import { useTextWidgetStore } from "~/stores/textWidgetStore";
import { useLinkStore } from "~/stores/linkStore";
import { useProfileStore } from "~/stores/profileStore";

async function redirectToLogin() {
  const profileStore = useProfileStore();
  profileStore.open();
  profileStore.activeTab = "user";
}
export function useClipboard() {
  const boardStore = useBoardStore();
  const noteStore = useNoteStore();
  const textWidgetStore = useTextWidgetStore();
  const linkStore = useLinkStore();
  const { updateItemPosition, calculateCenterPosition } = useItemManagement();
  const imageStore = useImageStore();
  const { loggedIn, clear } = useUserSession();

  // erro handler
  const { triggerError } = useErrorHandler();

  const handlePaste = async (e: ClipboardEvent) => {
    // Ignore if user is typing in an input field
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement ||
      !document.activeElement?.classList.contains("board")
    ) {
      return;
    }

    e.preventDefault();
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check for text
    const text = clipboardData.getData("text");
    if (text) {
      // Check if it's a URL
      try {
        const url = new URL(text);
        if (url.protocol === "http:" || url.protocol === "https:") {
          const position = calculateCenterPosition(400, 200);
          await linkStore.addLinkItem(text, {
            x: position.x,
            y: position.y,
            width: 400,
            height: 200,
          });
          return;
        }
      } catch (e) {
        // Not a valid URL, continue to treat as text
      }

      // If it's not a URL, add as a text widget or note
      if (text.length > 100) {
        const position = calculateCenterPosition(300, 200, "note");
        noteStore.addNote(text, {
          x: position.x,
          y: position.y,
          color: "#FFE589",
          width: 216,
          height: 216,
        });
      } else {
        const position = calculateCenterPosition(300, 100, "textWidget");
        textWidgetStore
          .addTextWidget({
            x: position.x,
            y: position.y,
            width: 300,
            height: 100,
          })
          .then((textWidget) => {
            // Update the text content using the new store method
            textWidgetStore.updateTextWidgetContent(textWidget.id, { text });
          })
          .catch((error) => {
            console.error("Error adding text widget:", error);
          });
      }
    }

    // Check for images

    const items = clipboardData.items;

    const fileGroups = [...items].reduce(
      (acc, item) => {
        if (item.type.indexOf("image") !== -1) {
          acc.image = acc.image
            ? [...acc.image, item.getAsFile()]
            : [item.getAsFile()];
        }
        return acc;
      },
      {} as Record<string, any>,
    );

    console.log(fileGroups);
    if (fileGroups.image) {
      if (loggedIn.value) {
        await imageStore.addImage(fileGroups.image);
      } else {
        triggerError({
          message: "Login to use Images and Files",
          title: "Login Required",
          onConfirm: redirectToLogin,
        });
      }
    }
  };

  // Helper function to calculate center position
  // const calculateCenterPosition = (width: number, height: number) => {
  //   return {
  //     x: -width / 2,
  //     y: -height / 2,
  //   };
  // };

  return {
    handlePaste,
  };
}
