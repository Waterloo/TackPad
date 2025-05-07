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

    Object.entries(data).forEach(([id, url]) => {
      boardStore.board.data.items.forEach((item) => {
        if (item.id === id && item.kind === "audio") {
          if (url) {
            item.content.url = url as string;
            formData.delete(id);
          } else {
            // Handle failed uploads
            item.content.status = "failed";
          }
        }
      });
    });

    boardStore.debouncedSaveBoard();
  };

  const updateAudioTitle = (audioId: string, title: string) => {
    if (!boardStore.board) return;

    const audioItem = boardStore.board.data.items.find(
      (item) => item.id === audioId && item.kind === "audio"
    ) as AudioItem | undefined;

    if (audioItem) {
      audioItem.title = title;
      console.log(audioItem, title);
      boardStore.debouncedSaveBoard();
    }
  };

  return {
    addAudio,
    updateAudioTitle,
  };
});
