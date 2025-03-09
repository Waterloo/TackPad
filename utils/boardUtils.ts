// utils/boardUtils.ts
import { useBoardStore } from '~/stores/board';

export function getBookMarkURL() {
  // Prompt user for URL
  const url = prompt('Enter URL:');
  if (!url) return;

  try {
    new URL(url); // Validate URL
    const boardStore = useBoardStore();
    
    // Calculate position
    const position = {
      x: -200,
      y: -100,
      width: 400,
      height: 200,
    };
    
    // Add link item
    boardStore.addLinkItem(url, position);
  } catch (e) {
    alert('Please enter a valid URL');
  }
}

export function applyOptimalZoom(
  items: any[], 
  updateZoom: (delta: number, centerX: number, centerY: number) => void,
  setTranslate?: (x: number, y: number) => void
) {
  if (!items || items.length === 0) return;

  // Find the bounding box of all items
  const bounds = items.reduce(
    (acc, item) => {
      const right = item.x_position + item.width;
      const bottom = item.y_position + item.height;
      return {
        left: Math.min(acc.left, item.x_position),
        top: Math.min(acc.top, item.y_position),
        right: Math.max(acc.right, right),
        bottom: Math.max(acc.bottom, bottom),
      };
    },
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  );

  // Calculate the center of the bounding box
  const center = {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2,
  };

  // Calculate the dimensions of the bounding box
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  // Calculate the scale needed to fit all items
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scaleX = viewportWidth / (width * 1.2); // Add 20% padding
  const scaleY = viewportHeight / (height * 1.2); // Add 20% padding
  const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

  // Apply the zoom
  updateZoom(
    scale, 
    viewportWidth / 2, 
    viewportHeight / 2
  );
  
  // If setTranslate function is provided, center the view on the items
  if (setTranslate) {
    // Calculate the translation needed to center the items
    // The viewportWidth/2 and viewportHeight/2 represent the center of the screen
    // We need to adjust for the scale and the center of the items
    const tx = viewportWidth / 2 - center.x * scale;
    const ty = viewportHeight / 2 - center.y * scale;
    
    // Apply the translation
    setTranslate(tx, ty);
  }
}