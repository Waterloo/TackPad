// utils/boardUtils.ts
import { useBoardStore } from '~/stores/board';

export function getBookMarkURL() {
  const route = useRoute();
  const apiURL = `${useRequestURL().protocol}//${
    useRequestURL().host
  }/api/bookmark/${route.params.id}`;

  const bookmarkletURI = `javascript:(function() {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('custom-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'custom-toast-container';
    toastContainer.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    \`;
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = \`
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 12px 24px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    min-width: 250px;
    animation: slideIn 0.3s ease-in-out;
  \`;

  // Add success icon
  const icon = document.createElement('span');
  icon.innerHTML = '✓';
  icon.style.cssText = \`
    color: #22C55E;
    margin-right: 12px;
    font-size: 20px;
  \`;

  // Add message container
  const messageContainer = document.createElement('div');
  messageContainer.style.cssText = \`
    flex-grow: 1;
  \`;

  // Add title
  const title = document.createElement('div');
  title.textContent = 'Bookmarked';
  title.style.cssText = \`
    font-weight: 600;
    font-size: 16px;
    color: #1a1a1a;
  \`;

  // Add message
  const message = document.createElement('div');
  message.textContent = 'You can access bookmark from the board';
  message.style.cssText = \`
    font-size: 14px;
    color: #666;
    margin-top: 2px;
  \`;

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = \`
    background: none;
    border: none;
    color: #999;
    font-size: 20px;
    cursor: pointer;
    padding: 0 0 0 12px;
  \`;
  closeButton.onclick = () => toast.remove();

  // Add styles for animation
  const style = document.createElement('style');
  style.textContent = \`
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  \`;
  document.head.appendChild(style);

  // Assemble toast
  messageContainer.appendChild(title);
  messageContainer.appendChild(message);
  toast.appendChild(icon);
  toast.appendChild(messageContainer);
  toast.appendChild(closeButton);
  toastContainer.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toastContainer.remove();
    style.remove();
  }, 3000);

  // Execute the original bookmarklet functionality
  fetch('${apiURL}', {
    method: 'POST',
    body: JSON.stringify({link: window.location.href}),
    headers: {'Content-Type': 'application/json'}
  });
})();`;

  return encodeURI(bookmarkletURI);
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