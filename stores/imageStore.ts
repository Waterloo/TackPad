import { customAlphabet } from "nanoid";
import { useBoardStore } from "./board";
import { defineStore } from "pinia";
import type { ImageItem } from "~/types/board";
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);

const getContrastingColor = (imageElement: HTMLImageElement): boolean => {
  // Create a canvas to sample the image
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Set canvas size to match image
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;

  // Draw the image on the canvas
  ctx.drawImage(imageElement, 0, 0, imageElement.width, imageElement.height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculate average color for top 20% of the image
  let red = 0,
    green = 0,
    blue = 0,
    alpha = 0;
  const topRowsCount = Math.floor(canvas.height * 0.2);
  let pixelCount = 0;

  for (let y = 0; y < topRowsCount; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const pixelAlpha = data[index + 3];

      // Only consider non-transparent pixels
      if (pixelAlpha > 0) {
        red += data[index] * (pixelAlpha / 255);
        green += data[index + 1] * (pixelAlpha / 255);
        blue += data[index + 2] * (pixelAlpha / 255);
        alpha += pixelAlpha;
        pixelCount++;
      }
    }
  }

  // Prevent division by zero
  if (pixelCount === 0) {
    // If all pixels are transparent, default to a dark background
    return false;
  }

  red = Math.floor((red / alpha) * 255);
  green = Math.floor((green / alpha) * 255);
  blue = Math.floor((blue / alpha) * 255);

  // Calculate luminance
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  // Return true if light, false if dark
  return luminance > 0.5;
};
export const useImageStore = defineStore("images", () => {
  const { calculateCenterPosition } = useItemManagement();
  const boardStore = useBoardStore();

  const addImage = async (images: File | File[]) => {
    console.log(images);
    if (!Array.isArray(images)) {
      images = [images];
    }

    const formData = new FormData();
    images.forEach((file, index) => {
      const id = `IMG-${nanoid(10)}`;
      formData.append(id, file);
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        // find optimal size
        const aspectRatio = img.width / img.height;
        const width = Math.min(400, img.width);
        const height = width / aspectRatio;
        const position = calculateCenterPosition(width, height, "image");
        const contrastColor = getContrastingColor(img);
        const ImageItem = {
          id,
          kind: "image",
          title: "Enter an image title",
          content: {
            url: URL.createObjectURL(file),
          },
          contrastColor,
          lock: false,
          x_position: position.x,
          y_position: position.y,
          width,
          height,
        };
        boardStore.addBoardItem(ImageItem);
        console.log("added image");
      };
    });

    const response = await fetch(`/api/upload/${boardStore.board?.board_id}`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    // return data
    Object.entries(data).forEach(([id, url]) => {
      const item = boardStore.board.data.items.get(id);
      if (item && item.kind === "image") {
        if (url) {
          // Create updated item with new URL
          const updatedItem = {
            ...item,
            content: { ...item.content, url: url as string }
          };
          boardStore.board.data.items.set(id, updatedItem);
          formData.delete(id);
        } else {
          // Handle failed uploads
          const updatedItem = {
            ...item,
            content: { ...item.content, status: "failed" }
          };
          boardStore.board.data.items.set(id, updatedItem);
        }
      }
    });

    boardStore.debouncedSaveBoard();
  };

  const updateImageTitle = (imageId: string, title: string) => {
    if (!boardStore.board) return;

    // Use Map.get() for O(1) lookup
    const imageItem = boardStore.board.data.items.get(imageId);

    if (imageItem && imageItem.kind === "image") {
      // Create updated item with new title
      const updatedItem = { ...imageItem, title };
      boardStore.board.data.items.set(imageId, updatedItem);
      console.log(updatedItem, title);
      boardStore.debouncedSaveBoard();
    }
  };

  return {
    addImage,
    updateImageTitle,
  };
});
