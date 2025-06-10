import { customAlphabet } from "nanoid";
import { useBoardStore } from "./board";
import { defineStore } from "pinia";
import type { AudioItem } from "~/types/board";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);

export const useAudioStore = defineStore("audio", () => {
  const { calculateCenterPosition } = useItemManagement();
  const boardStore = useBoardStore();

  const addAudio = async (audios: File | File[], title?: string) => {
    if (!Array.isArray(audios)) {
      audios = [audios];
    }

    const formData = new FormData();
    audios.forEach((file) => {
      const id = `AUD-${nanoid(10)}`;
      formData.append(id, file);

      // Create audio element to get metadata if needed
      const audio = new Audio(URL.createObjectURL(file));
      audio.onloadedmetadata = () => {
        // Calculate position and size
        const width = 300; // Default width for audio item
        const height = 100; // Default height for audio item
        const position = calculateCenterPosition(width, height, "audio");

        const audioItem: AudioItem = {
          id,
          kind: "audio",
          title: title ?? "Enter an audio title",
          content: {
            url: URL.createObjectURL(file),
          },
          lock: false,
          x_position: position.x,
          y_position: position.y,
          width,
          height,
        };

        boardStore.addBoardItem(audioItem);
        console.log("added audio");
      };
    });

    const response = await fetch(`/api/upload/${boardStore.board?.board_id}`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();


    // Replace the forEach loop that updates URLs after upload
    Object.entries(data).forEach(([id, url]) => {
      const item = boardStore.board.data.items.get(id);
      if (item && item.kind === "audio") {
        if (url) {
          // Create updated item with new URL
          const updatedItem = { ...item, content: { ...item.content, url: url as string } };
          boardStore.board.data.items.set(id, updatedItem);
          formData.delete(id);
        } else {
          // Handle failed uploads
          const updatedItem = { ...item, content: { ...item.content, status: "failed" } };
          boardStore.board.data.items.set(id, updatedItem);
        }
      }
    });


    boardStore.debouncedSaveBoard();
  };

  const updateAudioTitle = (audioId: string, title: string) => {
    if (!boardStore.board) return;

    // Use Map.get() for O(1) lookup
    const audioItem = boardStore.board.data.items.get(audioId);

    if (audioItem && audioItem.kind === "audio") {
      // Create updated item with new title
      const updatedItem = { ...audioItem, title };
      boardStore.board.data.items.set(audioId, updatedItem);
      console.log(updatedItem, title);
      boardStore.debouncedSaveBoard();
    }
  };


  return {
    addAudio,
    updateAudioTitle,
  };
});
