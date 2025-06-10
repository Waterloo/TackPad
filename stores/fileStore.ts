import { customAlphabet } from "nanoid";
import { useBoardStore } from "./board";
import { defineStore } from "pinia";
import type { FileItem } from "~/types/board";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);

export const useFileStore = defineStore("file", () => {
  const { calculateCenterPosition } = useItemManagement();
  const boardStore = useBoardStore();

  const addFile = async (files: File | File[]) => {
    if (!Array.isArray(files)) {
      files = [files];
    }

    const formData = new FormData();
    const fileIds: string[] = [];

    files.forEach((file) => {
      const id = `FILE-${nanoid(10)}`;
      formData.append(id, file);
      fileIds.push(id);
    });

    const response = await fetch(`/api/upload/${boardStore.board?.board_id}`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    // Create and add file items to the board after successful upload
    Object.entries(data).forEach(([id, url]) => {
      if (fileIds.includes(id)) {
        const file = files.find((f) => formData.get(id) === f);

        if (file && url) {
          // Calculate position
          const width = 300; // Default width for file item
          const height = 50; // Default height for file item
          const position = calculateCenterPosition(width, height, "file");

          const fileItem: FileItem = {
            id,
            kind: "file",
            title: file.name, // Use original filename as default title
            content: {
              url: url as string,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            },
            lock: false,
            x_position: position.x,
            y_position: position.y,
            width,
            height,
          };

          boardStore.addBoardItem(fileItem);
        } else {
          // Handle failed uploads
          const failedFileItem: FileItem = {
            id,
            kind: "file",
            title: "Upload Failed",
            content: {
              status: "failed",
            },
            lock: false,
            x_position: 0,
            y_position: 0,
            width: 300,
            height: 50,
          };

          boardStore.addBoardItem(failedFileItem);
        }
      }
    });

    boardStore.debouncedSaveBoard();
  };

  const updateFileTitle = (fileId: string, title: string) => {
    if (!boardStore.board) return;

    // Use Map.get() for O(1) lookup
    const fileItem = boardStore.board.data.items.get(fileId);

    if (fileItem && fileItem.kind === "file") {
      // Create updated item with new title
      const updatedItem = { ...fileItem, title };
      boardStore.board.data.items.set(fileId, updatedItem);
      console.log(updatedItem, title);
      boardStore.debouncedSaveBoard();
    }
  };



  return {
    addFile,
    updateFileTitle,
  };
});
