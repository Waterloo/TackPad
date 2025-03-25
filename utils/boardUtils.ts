// utils/boardUtils.ts
import { useBoardStore } from '~/stores/board';

export function getBookMarkURL() {
  const route = useRoute();
  const baseUrl = `${useRequestURL().protocol}//${
    useRequestURL().host
  }`
  const boardId = route.params.id
const bookmarkletURI = `javascript:(function(){
  window.myScriptConfig = {
    baseUrl: '${baseUrl}',
    boardId:'${boardId}'
  };
  
  let script = document.createElement('script');
  script.src = '${baseUrl}/scripts/bookmarklet.js';
  document.body.appendChild(script);
})();`;

// Return the raw javascript: URL
return bookmarkletURI;
}

export function applyOptimalZoom(
  items: any[], 
  updateZoom: (delta: number, centerX: number, centerY: number) => void,
  setTranslate?: (x: number, y: number) => void,
  selectedId?: string | null
) {
  
  if (!items || items.length === 0) return;

  // Find the selected item if selectedId is provided
  const selectedItem = selectedId ? items.find(item => item.id === selectedId) : null;
  
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

  // Calculate the center of the bounding box or use the center of the selected item
  const center = selectedItem 
    ? {
        x: selectedItem.x_position + (selectedItem.width / 2),
        y: selectedItem.y_position + (selectedItem.height / 2),
      }
    : {
        x: (bounds.left + bounds.right) / 2,
        y: (bounds.top + bounds.bottom) / 2,
      };

  // Calculate the dimensions of the bounding box
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Detect if we're on mobile
  const isMobile = window.innerWidth <= 768;
  
  // Adjust padding based on device type
  const paddingFactor = isMobile ? 1.1 : 1.2; // Less padding on mobile
  
  // Calculate the scale needed to fit items
  const scaleX = viewportWidth / (width * paddingFactor);
  const scaleY = viewportHeight / (height * paddingFactor);
  
  // For optimal zoom, we want to find a balance between:
  // 1. Showing all items (not cutting them off)
  // 2. Not zooming out too much (making items too small)
  // 3. Not zooming in too much (losing context)
  
  // Define min/max scale constraints
  const MIN_SCALE = isMobile ? 0.6 : 0.7; // Lower minimum scale on mobile
  const MAX_SCALE = 0.9; // Don't zoom in too much for optimal view
  
  // Calculate optimal scale
  let scale = Math.min(scaleX, scaleY);
  
  // Apply constraints to ensure items are visible at a reasonable size
  scale = Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
  
  // If there's only one item or a few small items, don't zoom in too much
  if (items.length <= 3 && width < viewportWidth / 2 && height < viewportHeight / 2) {
    scale = Math.min(scale, 0.8); // Cap the zoom level for small item sets
  }
  
  // If we have a selected item, adjust scale to ensure it's visible at a reasonable size
  if (selectedItem) {
    // Ensure the selected item is not too small
    const minSelectedItemScale = Math.min(
      viewportWidth / (selectedItem.width * 3),
      viewportHeight / (selectedItem.height * 3)
    );
    
    // Balance between overall view and selected item visibility
    scale = Math.min(Math.max(scale, minSelectedItemScale), MAX_SCALE);
  }

  // Apply the zoom
  updateZoom(
    scale, 
    viewportWidth / 2, 
    viewportHeight / 2
  );
  
  // If setTranslate function is provided, center the view on the selected item or all items
  if (setTranslate) {
    // Calculate the translation needed to center the view on the selected item or all items
    const tx = viewportWidth / 2 - center.x * scale;
    const ty = viewportHeight / 2 - center.y * scale;
    
    // Apply the translation to center the view
    setTranslate(tx, ty);
  }
}

export function applyOverviewZoom(
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