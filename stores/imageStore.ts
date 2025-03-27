import { customAlphabet } from "nanoid";
import { useBoardStore } from "./board";
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
    blue = 0;
  const topRowsCount = Math.floor(canvas.height * 0.2);
  let pixelCount = 0;

  for (let y = 0; y < topRowsCount; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      red += data[index];
      green += data[index + 1];
      blue += data[index + 2];
      pixelCount++;
    }
  }

  red = Math.floor(red / pixelCount);
  green = Math.floor(green / pixelCount);
  blue = Math.floor(blue / pixelCount);

  // Calculate luminance
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  // Return true if light, false if dark
  return luminance > 0.5;
};
export const useImageStore = defineStore("images", () => {
  const { calculateCenterPosition } = useItemManagement();
  const boardStore = useBoardStore();

  const addImage = async (images: File | File[]) => {
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
        boardStore.board.data.items.push(ImageItem);
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
      boardStore.board.data.items.forEach((item, index) => {
        if (item.id === id && item.kind === "image") {
          if (url) {
            item.content.url = url as string;
            formData.delete(id);
          } else {
            // TODO: remove failed images when selecting items from board
            item.content.status = "failed";
          }
        }
      });
    });

    boardStore.debouncedSaveBoard();
  };

  return {
    addImage,
  };
});
