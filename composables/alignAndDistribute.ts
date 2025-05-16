/**
 * Align items horizontally or vertically
 * @param {Array} items - Array of whiteboard items
 * @param {string} alignment - 'left', 'center', 'right', 'top', 'middle', 'bottom'
 * @returns {Array} Updated items with new positions
 */
export function alignItems(items, alignment) {
  if (!items || items.length < 2) return items;

  const itemsCopy = JSON.parse(JSON.stringify(items));

  // Find reference position based on alignment type
  let referenceValue;

  switch (alignment) {
    case 'left': {
      // Leftmost edge
      referenceValue = Math.min(...itemsCopy.map(item => item.x_position));
      itemsCopy.forEach(item => {
        item.x_position = referenceValue;
      });
      break;
    }
    case 'center': {
      // Average of centers
      referenceValue = itemsCopy.reduce((sum, item) => sum + (item.x_position + item.width / 2), 0) / itemsCopy.length;
      itemsCopy.forEach(item => {
        item.x_position = referenceValue - (item.width / 2);
      });
      break;
    }
    case 'right': {
      // Rightmost edge
      referenceValue = Math.max(...itemsCopy.map(item => item.x_position + item.width));
      itemsCopy.forEach(item => {
        item.x_position = referenceValue - item.width;
      });
      break;
    }
    case 'top': {
      // Topmost edge
      referenceValue = Math.min(...itemsCopy.map(item => item.y_position));
      itemsCopy.forEach(item => {
        item.y_position = referenceValue;
      });
      break;
    }
    case 'middle': {
      // Average of middles
      referenceValue = itemsCopy.reduce((sum, item) => sum + (item.y_position + item.height / 2), 0) / itemsCopy.length;
      itemsCopy.forEach(item => {
        item.y_position = referenceValue - (item.height / 2);
      });
      break;
    }
    case 'bottom': {
      // Bottommost edge
      referenceValue = Math.max(...itemsCopy.map(item => item.y_position + item.height));
      itemsCopy.forEach(item => {
        item.y_position = referenceValue - item.height;
      });
      break;
    }
  }

  return itemsCopy;
}
/**
 * Distribute items evenly horizontally or vertically
 * @param {Array} items - Array of whiteboard items
 * @param {string} direction - 'horizontal' or 'vertical'
 * @param {boolean} sortByKind - Whether to sort and group items by kind
 * @returns {Array} Updated items with new positions
 */
export function distributeItems(items, direction, sortByKind = false) {
  if (!items || items.length < 3) return items; // Need at least 3 items for distribution

  const itemsCopy = JSON.parse(JSON.stringify(items));

  // Sort items first by kind if enabled, then by position
  if (sortByKind) {
    itemsCopy.sort((a, b) => {
      if (a.kind === b.kind) {
        return direction === 'horizontal' ? a.x_position - b.x_position : a.y_position - b.y_position;
      }
      return a.kind.localeCompare(b.kind);
    });
  } else {
    // Just sort by position
    if (direction === 'horizontal') {
      itemsCopy.sort((a, b) => a.x_position - b.x_position);
    } else {
      itemsCopy.sort((a, b) => a.y_position - b.y_position);
    }
  }

  // Calculate total available space
  if (direction === 'horizontal') {
    const leftmostItem = itemsCopy[0];
    const rightmostItem = itemsCopy[itemsCopy.length - 1];
    const leftEdge = leftmostItem.x_position;
    const rightEdge = rightmostItem.x_position + rightmostItem.width;
    const totalWidth = rightEdge - leftEdge;

    // Calculate total width of all items
    const itemsWidth = itemsCopy.reduce((sum, item) => sum + item.width, 0);

    // Calculate available space for gaps
    const availableSpace = totalWidth - itemsWidth;
    const gap = availableSpace / (itemsCopy.length - 1);

    // Position each item (keep first and last items in place)
    let currentPosition = leftEdge;
    for (let i = 0; i < itemsCopy.length; i++) {
      if (i === 0) {
        currentPosition += itemsCopy[i].width;
      } else if (i === itemsCopy.length - 1) {
        // Last item stays in place
      } else {
        itemsCopy[i].x_position = currentPosition + gap;
        currentPosition = itemsCopy[i].x_position + itemsCopy[i].width;
      }
    }
  } else if (direction === 'vertical') {
    const topmostItem = itemsCopy[0];
    const bottommostItem = itemsCopy[itemsCopy.length - 1];
    const topEdge = topmostItem.y_position;
    const bottomEdge = bottommostItem.y_position + bottommostItem.height;
    const totalHeight = bottomEdge - topEdge;

    // Calculate total height of all items
    const itemsHeight = itemsCopy.reduce((sum, item) => sum + item.height, 0);

    // Calculate available space for gaps
    const availableSpace = totalHeight - itemsHeight;
    const gap = availableSpace / (itemsCopy.length - 1);

    // Position each item (keep first and last items in place)
    let currentPosition = topEdge;
    for (let i = 0; i < itemsCopy.length; i++) {
      if (i === 0) {
        currentPosition += itemsCopy[i].height;
      } else if (i === itemsCopy.length - 1) {
        // Last item stays in place
      } else {
        itemsCopy[i].y_position = currentPosition + gap;
        currentPosition = itemsCopy[i].y_position + itemsCopy[i].height;
      }
    }
  }

  return itemsCopy;
}

/**
 * Distribute items evenly with equal spacing horizontally or vertically
 * @param {Array} items - Array of whiteboard items
 * @param {string} direction - 'horizontal' or 'vertical'
 * @param {boolean} sortByKind - Whether to sort and group items by kind
 * @returns {Array} Updated items with new positions
 */
export function distributeEvenlyItems(items, direction, sortByKind = false) {
  if (!items || items.length < 2) return items;

  const itemsCopy = JSON.parse(JSON.stringify(items));

  // Sort items first by kind if enabled, then by position
  if (sortByKind) {
    itemsCopy.sort((a, b) => {
      if (a.kind === b.kind) {
        return direction === 'horizontal' ? a.x_position - b.x_position : a.y_position - b.y_position;
      }
      return a.kind.localeCompare(b.kind);
    });
  } else {
    // Just sort by position
    if (direction === 'horizontal') {
      itemsCopy.sort((a, b) => a.x_position - b.x_position);
    } else {
      itemsCopy.sort((a, b) => a.y_position - b.y_position);
    }
  }

  if (direction === 'horizontal') {
    // Find the leftmost and rightmost positions
    const leftEdge = Math.min(...itemsCopy.map(item => item.x_position));
    const rightEdge = Math.max(...itemsCopy.map(item => item.x_position + item.width));
    const totalWidth = rightEdge - leftEdge;

    // Calculate total width of items
    const totalItemWidth = itemsCopy.reduce((sum, item) => sum + item.width, 0);

    // Calculate spacing between items
    const spacing = (totalWidth - totalItemWidth) / (itemsCopy.length - 1);

    // Adjust positions
    let currentX = leftEdge;
    for (let i = 0; i < itemsCopy.length; i++) {
      itemsCopy[i].x_position = currentX;
      currentX += itemsCopy[i].width + spacing;
    }
  } else if (direction === 'vertical') {
    // Find the topmost and bottommost positions
    const topEdge = Math.min(...itemsCopy.map(item => item.y_position));
    const bottomEdge = Math.max(...itemsCopy.map(item => item.y_position + item.height));
    const totalHeight = bottomEdge - topEdge;

    // Calculate total height of items
    const totalItemHeight = itemsCopy.reduce((sum, item) => sum + item.height, 0);

    // Calculate spacing between items
    const spacing = (totalHeight - totalItemHeight) / (itemsCopy.length - 1);

    // Adjust positions
    let currentY = topEdge;
    for (let i = 0; i < itemsCopy.length; i++) {
      itemsCopy[i].y_position = currentY;
      currentY += itemsCopy[i].height + spacing;
    }
  }

  return itemsCopy;
}
