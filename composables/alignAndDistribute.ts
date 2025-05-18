/**
 * Aligns items intelligently based on their relative positions and content
 * @param {Array} items - Array of item objects to align
 * @param {Object} options - Configuration options
 * @param {string} options.direction - Direction to align ('left', 'right', 'top', 'bottom')
 * @param {boolean} options.sort - Whether to group items by kind before alignment
 * @param {number} [options.spacing] - Optional spacing between elements
 * @returns {Array} Updated items with new positions
 */
export function smartAlign(items, options) {
  if (!items || items.length < 2) {
    return items;
  }

  // Create a deep copy to avoid mutating original array
  const itemsCopy = JSON.parse(JSON.stringify(items));

  // Default spacing if not provided
  const spacing = options.spacing || 10;
  const direction = options.direction;

  // Sort by kind if requested
  if (options.sort) {
    itemsCopy.sort((a, b) => a.kind.localeCompare(b.kind));
  }

  // Detect if items are primarily in rows or columns
  const orientation = detectOrientation(itemsCopy);

  // Apply alignment based on direction
  switch (direction) {
    case 'left':
      return alignLeft(itemsCopy, orientation, spacing, options.sort);
    case 'right':
      return alignRight(itemsCopy, orientation, spacing, options.sort);
    case 'top':
      return alignTop(itemsCopy, orientation, spacing, options.sort);
    case 'bottom':
      return alignBottom(itemsCopy, orientation, spacing, options.sort);
    default:
      return itemsCopy;
  }
}

/**
 * Arranges items in a grid pattern
 * @param {Array} items - Array of item objects to arrange
 * @param {Object} options - Configuration options
 * @param {number|string} options.columns - Number of columns or 'auto'
 * @param {boolean} options.sort - Whether to group items by kind before arrangement
 * @param {number} [options.spacing] - Optional spacing between elements
 * @param {number} [options.startX] - Starting X position (defaults to leftmost item)
 * @param {number} [options.startY] - Starting Y position (defaults to topmost item)
 * @returns {Array} Updated items with new positions
 */
export function gridArrange(items, options) {
  if (!items || items.length < 3) {
    return items;
  }

  // Create a deep copy to avoid mutating original array
  const itemsCopy = JSON.parse(JSON.stringify(items));

  // Default spacing if not provided
  const spacing = options.spacing || 10;

  // Sort by kind if requested
  if (options.sort) {
    itemsCopy.sort((a, b) => a.kind.localeCompare(b.kind));
  }

  // Determine starting position
  const startX = options.startX !== undefined ?
    options.startX :
    Math.min(...itemsCopy.map(item => item.x_position));

  const startY = options.startY !== undefined ?
    options.startY :
    Math.min(...itemsCopy.map(item => item.y_position));

  // Determine number of columns
  let columns = options.columns;
  if (columns === 'auto') {
    // Calculate optimal columns based on number of items
    columns = Math.ceil(Math.sqrt(itemsCopy.length));
  }

  return arrangeInGrid(itemsCopy, columns, spacing, startX, startY, options.sort);
}

/**
 * Detects whether items are arranged primarily in rows or columns
 * @param {Array} items - Array of items to analyze
 * @returns {string} 'row' or 'column'
 */
function detectOrientation(items) {
  // Sort items by position for analysis
  const sortedByX = [...items].sort((a, b) => a.x_position - b.x_position);
  const sortedByY = [...items].sort((a, b) => a.y_position - b.y_position);

  // Calculate average distance between items in both dimensions
  let avgXDiff = 0;
  let avgYDiff = 0;

  for (let i = 1; i < items.length; i++) {
    avgXDiff += Math.abs(sortedByX[i].x_position - sortedByX[i-1].x_position);
    avgYDiff += Math.abs(sortedByY[i].y_position - sortedByY[i-1].y_position);
  }

  avgXDiff /= (items.length - 1);
  avgYDiff /= (items.length - 1);

  // If items are more spaced out horizontally, they're likely in a row
  // Otherwise, they're likely in a column
  return avgXDiff > avgYDiff ? 'row' : 'column';
}

/**
 * Check if two items would overlap after repositioning
 * @param {Object} item1 - First item
 * @param {Object} item2 - Second item
 * @returns {boolean} True if items would overlap
 */
function wouldOverlap(item1, item2) {
  return !(
    item1.x_position + item1.width <= item2.x_position ||
    item2.x_position + item2.width <= item1.x_position ||
    item1.y_position + item1.height <= item2.y_position ||
    item2.y_position + item2.height <= item1.y_position
  );
}

/**
 * Groups items by rows based on their vertical positions
 * @param {Array} items - Array of items to group
 * @returns {Array} Array of rows, each containing items
 */
function groupByRows(items) {
  const rows = [];
  const sortedItems = [...items].sort((a, b) => a.y_position - b.y_position);

  let currentRow = [sortedItems[0]];
  let currentRowY = sortedItems[0].y_position;

  for (let i = 1; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    // If item is at roughly the same height as current row, add to that row
    if (Math.abs(item.y_position - currentRowY) < item.height / 2) {
      currentRow.push(item);
    } else {
      // Otherwise, start a new row
      rows.push([...currentRow]);
      currentRow = [item];
      currentRowY = item.y_position;
    }
  }

  // Add the last row
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Sort items within each row by x position
  rows.forEach(row => row.sort((a, b) => a.x_position - b.x_position));

  return rows;
}

/**
 * Groups items by columns based on their horizontal positions
 * @param {Array} items - Array of items to group
 * @returns {Array} Array of columns, each containing items
 */
function groupByColumns(items) {
  const columns = [];
  const sortedItems = [...items].sort((a, b) => a.x_position - b.x_position);

  let currentColumn = [sortedItems[0]];
  let currentColumnX = sortedItems[0].x_position;

  for (let i = 1; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    // If item is at roughly the same x position as current column, add to that column
    if (Math.abs(item.x_position - currentColumnX) < item.width / 2) {
      currentColumn.push(item);
    } else {
      // Otherwise, start a new column
      columns.push([...currentColumn]);
      currentColumn = [item];
      currentColumnX = item.x_position;
    }
  }

  // Add the last column
  if (currentColumn.length > 0) {
    columns.push(currentColumn);
  }

  // Sort items within each column by y position
  columns.forEach(column => column.sort((a, b) => a.y_position - b.y_position));

  return columns;
}

/**
 * Aligns items to the left edge
 * @param {Array} items - Items to align
 * @param {string} orientation - Detected orientation ('row' or 'column')
 * @param {number} spacing - Spacing between elements
 * @param {boolean} sortEnabled - Whether items were sorted by kind
 * @returns {Array} Updated items with new positions
 */
function alignLeft(items, orientation, spacing, sortEnabled) {
  if (orientation === 'row') {
    // Items are primarily in rows, maintain that structure
    const rows = groupByRows(items);
    let result = [];

    rows.forEach((row, rowIndex) => {
      // Sort each row by x position
      row.sort((a, b) => a.x_position - b.x_position);

      // Find the leftmost position for this row
      const leftEdge = Math.min(...row.map(item => item.x_position));

      // Align all items in this row to the left
      row.forEach((item, index) => {
        item.x_position = index === 0 ?
          leftEdge :
          result[result.length - 1].x_position + result[result.length - 1].width + spacing;

        result.push(item);
      });
    });

    return result;
  } else {
    // Items are primarily in a column or need to be rearranged
    let leftEdge = Math.min(...items.map(item => item.x_position));

    if (sortEnabled) {
      // Group by kind for sorted alignment
      const kinds = [...new Set(items.map(item => item.kind))];
      let result = [];
      let currentY = Math.min(...items.map(item => item.y_position));

      kinds.forEach(kind => {
        const kindItems = items.filter(item => item.kind === kind);
        kindItems.forEach((item, index) => {
          item.x_position = leftEdge;
          item.y_position = currentY;
          currentY += item.height + spacing;
          result.push(item);
        });
      });

      return result;
    } else {
      // Simple column alignment
      items.sort((a, b) => a.y_position - b.y_position);
      let currentY = items[0].y_position;

      items.forEach((item, index) => {
        item.x_position = leftEdge;
        if (index > 0) {
          item.y_position = currentY;
          currentY += item.height + spacing;
        } else {
          currentY = item.y_position + item.height + spacing;
        }
      });

      return items;
    }
  }
}

/**
 * Aligns items to the right edge
 * @param {Array} items - Items to align
 * @param {string} orientation - Detected orientation ('row' or 'column')
 * @param {number} spacing - Spacing between elements
 * @param {boolean} sortEnabled - Whether items were sorted by kind
 * @returns {Array} Updated items with new positions
 */
function alignRight(items, orientation, spacing, sortEnabled) {
  if (orientation === 'row') {
    // Items are primarily in rows, maintain that structure
    const rows = groupByRows(items);
    let result = [];

    rows.forEach((row, rowIndex) => {
      // Sort each row by x position
      row.sort((a, b) => a.x_position - b.x_position);

      // Find the rightmost position for this row
      const rightEdge = Math.max(...row.map(item => item.x_position + item.width));

      // Align all items in this row to the right, working backward
      for (let i = row.length - 1; i >= 0; i--) {
        if (i === row.length - 1) {
          row[i].x_position = rightEdge - row[i].width;
        } else {
          row[i].x_position = row[i+1].x_position - spacing - row[i].width;
        }
      }

      result = result.concat(row);
    });

    return result;
  } else {
    // Items are primarily in a column or need to be rearranged
    let rightEdge = Math.max(...items.map(item => item.x_position + item.width));

    if (sortEnabled) {
      // Group by kind for sorted alignment
      const kinds = [...new Set(items.map(item => item.kind))];
      let result = [];
      let currentY = Math.min(...items.map(item => item.y_position));

      kinds.forEach(kind => {
        const kindItems = items.filter(item => item.kind === kind);
        kindItems.forEach((item, index) => {
          item.x_position = rightEdge - item.width;
          item.y_position = currentY;
          currentY += item.height + spacing;
          result.push(item);
        });
      });

      return result;
    } else {
      // Simple column alignment
      items.sort((a, b) => a.y_position - b.y_position);
      let currentY = items[0].y_position;

      items.forEach((item, index) => {
        item.x_position = rightEdge - item.width;
        if (index > 0) {
          item.y_position = currentY;
          currentY += item.height + spacing;
        } else {
          currentY = item.y_position + item.height + spacing;
        }
      });

      return items;
    }
  }
}

/**
 * Aligns items to the top edge
 * @param {Array} items - Items to align
 * @param {string} orientation - Detected orientation ('row' or 'column')
 * @param {number} spacing - Spacing between elements
 * @param {boolean} sortEnabled - Whether items were sorted by kind
 * @returns {Array} Updated items with new positions
 */
function alignTop(items, orientation, spacing, sortEnabled) {
  if (orientation === 'column') {
    // Items are primarily in columns, maintain that structure
    const columns = groupByColumns(items);
    let result = [];

    columns.forEach(column => {
      // Sort each column by y position
      column.sort((a, b) => a.y_position - b.y_position);

      // Find the top edge for this column
      const topEdge = Math.min(...column.map(item => item.y_position));

      // Align all items in this column to the top
      column.forEach((item, index) => {
        item.y_position = index === 0 ?
          topEdge :
          result[result.length - 1].y_position + result[result.length - 1].height + spacing;

        result.push(item);
      });
    });

    return result;
  } else {
    // Items are primarily in a row or need to be rearranged
    let topEdge = Math.min(...items.map(item => item.y_position));

    if (sortEnabled) {
      // Group by kind for sorted alignment
      const kinds = [...new Set(items.map(item => item.kind))];
      let result = [];
      let currentX = Math.min(...items.map(item => item.x_position));

      kinds.forEach(kind => {
        const kindItems = items.filter(item => item.kind === kind);
        kindItems.forEach((item, index) => {
          item.y_position = topEdge;
          item.x_position = currentX;
          currentX += item.width + spacing;
          result.push(item);
        });
      });

      return result;
    } else {
      // Simple row alignment
      items.sort((a, b) => a.x_position - b.x_position);
      let currentX = items[0].x_position;

      items.forEach((item, index) => {
        item.y_position = topEdge;
        if (index > 0) {
          item.x_position = currentX;
          currentX += item.width + spacing;
        } else {
          currentX = item.x_position + item.width + spacing;
        }
      });

      return items;
    }
  }
}

/**
 * Aligns items to the bottom edge
 * @param {Array} items - Items to align
 * @param {string} orientation - Detected orientation ('row' or 'column')
 * @param {number} spacing - Spacing between elements
 * @param {boolean} sortEnabled - Whether items were sorted by kind
 * @returns {Array} Updated items with new positions
 */
function alignBottom(items, orientation, spacing, sortEnabled) {
  if (orientation === 'column') {
    // Items are primarily in columns, maintain that structure
    const columns = groupByColumns(items);
    let result = [];

    columns.forEach(column => {
      // Sort each column by y position
      column.sort((a, b) => a.y_position - b.y_position);

      // Find the bottom edge for this column
      const bottomEdge = Math.max(...column.map(item => item.y_position + item.height));

      // Align all items in this column to the bottom, working backward
      for (let i = column.length - 1; i >= 0; i--) {
        if (i === column.length - 1) {
          column[i].y_position = bottomEdge - column[i].height;
        } else {
          column[i].y_position = column[i+1].y_position - spacing - column[i].height;
        }
      }

      result = result.concat(column);
    });

    return result;
  } else {
    // Items are primarily in a row or need to be rearranged
    let bottomEdge = Math.max(...items.map(item => item.y_position + item.height));

    if (sortEnabled) {
      // Group by kind for sorted alignment
      const kinds = [...new Set(items.map(item => item.kind))];
      let result = [];
      let currentX = Math.min(...items.map(item => item.x_position));

      kinds.forEach(kind => {
        const kindItems = items.filter(item => item.kind === kind);
        kindItems.forEach((item, index) => {
          item.y_position = bottomEdge - item.height;
          item.x_position = currentX;
          currentX += item.width + spacing;
          result.push(item);
        });
      });

      return result;
    } else {
      // Simple row alignment
      items.sort((a, b) => a.x_position - b.x_position);
      let currentX = items[0].x_position;

      items.forEach((item, index) => {
        item.y_position = bottomEdge - item.height;
        if (index > 0) {
          item.x_position = currentX;
          currentX += item.width + spacing;
        } else {
          currentX = item.x_position + item.width + spacing;
        }
      });

      return items;
    }
  }
}

/**
 * Arranges items in a grid pattern
 * @param {Array} items - Items to arrange
 * @param {number} columns - Number of columns
 * @param {number} spacing - Spacing between elements
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {boolean} sortEnabled - Whether items were sorted by kind
 * @returns {Array} Updated items with new positions
 */
function arrangeInGrid(items, columns, spacing, startX, startY, sortEnabled) {
  // Create a new array to store the result
  const result = JSON.parse(JSON.stringify(items));

  if (sortEnabled) {
    // Group by kind for sorted grid arrangement
    const kinds = [...new Set(result.map(item => item.kind))];
    let currentX = startX;
    let currentY = startY;
    let maxHeightInRow = 0;
    let colInRow = 0;

    let index = 0;
    kinds.forEach(kind => {
      const kindItems = result.filter(item => item.kind === kind);

      kindItems.forEach(item => {
        if (colInRow === columns) {
          // Move to next row
          currentY += maxHeightInRow + spacing;
          currentX = startX;
          colInRow = 0;
          maxHeightInRow = 0;
        }

        // Position item
        item.x_position = currentX;
        item.y_position = currentY;

        // Update trackers
        maxHeightInRow = Math.max(maxHeightInRow, item.height);
        currentX += item.width + spacing;
        colInRow++;

        // Update the result array
        result[index++] = item;
      });

      // After each kind, make sure next kind starts on a new row
      if (colInRow > 0) {
        currentY += maxHeightInRow + spacing;
        currentX = startX;
        colInRow = 0;
        maxHeightInRow = 0;
      }
    });
  } else {
    // Standard grid arrangement
    let currentX = startX;
    let currentY = startY;
    let maxHeightInRow = 0;
    let colInRow = 0;

    result.forEach(item => {
      if (colInRow === columns) {
        // Move to next row
        currentY += maxHeightInRow + spacing;
        currentX = startX;
        colInRow = 0;
        maxHeightInRow = 0;
      }

      // Position item
      item.x_position = currentX;
      item.y_position = currentY;

      // Update trackers
      maxHeightInRow = Math.max(maxHeightInRow, item.height);
      currentX += item.width + spacing;
      colInRow++;
    });
  }

  return result;
}
