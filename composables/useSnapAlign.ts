export function calculateAlignmentGuides(movingItem, nearbyItems, snapThreshold = 10) {
  const isSelection = movingItem.kind === 'selection';
  const padding = isSelection ? 20 : 0;

  const snapLines = [];
  let snappedPosition = {
    x: movingItem.x_position,
    y: movingItem.y_position
  };

  // Track best snap distances
  let bestXSnapDistance = snapThreshold;
  let bestYSnapDistance = snapThreshold;

  // For selection, the actual content is 20px inside the box
  // So we need to adjust our edge calculations accordingly
  const activeLeft = isSelection ? movingItem.x_position + padding : movingItem.x_position;
  const activeRight = isSelection ? movingItem.x_position + movingItem.width - padding : movingItem.x_position + movingItem.width;
  const activeTop = isSelection ? movingItem.y_position + padding : movingItem.y_position;
  const activeBottom = isSelection ? movingItem.y_position + movingItem.height - padding : movingItem.y_position + movingItem.height;
  const activeCenterX = activeLeft + ((activeRight - activeLeft) / 2);
  const activeCenterY = activeTop + ((activeBottom - activeTop) / 2);

  // Maps to track best alignments
  const bestVerticalAlignments = new Map();
  const bestHorizontalAlignments = new Map();

  // Check each nearby item for potential alignments
  for (const item of nearbyItems) {
    if (item.id === movingItem.id) continue;

    // Calculate edges and center of the nearby item
    const otherLeft = item.x_position;
    const otherRight = item.x_position + item.width;
    const otherTop = item.y_position;
    const otherBottom = item.y_position + item.height;
    const otherCenterX = otherLeft + (item.width / 2);
    const otherCenterY = otherTop + (item.height / 2);

    // Check vertical alignments (x-axis)
    const verticalAlignments = [
      { value: otherLeft, type: "left-to-left", active: activeLeft, priority: 1,
        newX: isSelection ? otherLeft - padding : otherLeft },
      { value: otherRight, type: "right-to-right", active: activeRight, priority: 1,
        newX: isSelection ? otherRight - movingItem.width + padding : otherRight - movingItem.width },
      { value: otherCenterX, type: "center-x", active: activeCenterX, priority: 2,
        newX: isSelection ? otherCenterX - (movingItem.width / 2) : otherCenterX - (movingItem.width / 2) },
      { value: otherRight, type: "left-to-right", active: activeLeft, priority: 3,
        newX: isSelection ? otherRight - padding : otherRight },
      { value: otherLeft, type: "right-to-left", active: activeRight, priority: 3,
        newX: isSelection ? otherLeft - movingItem.width + padding : otherLeft - movingItem.width }
    ];

    for (const align of verticalAlignments) {
      const distance = Math.abs(align.active - align.value);
      if (distance < snapThreshold && distance <= bestXSnapDistance) {
        const key = align.type;

        if (distance < bestXSnapDistance) {
          bestXSnapDistance = distance;
          bestVerticalAlignments.clear();
        }

        if (!bestVerticalAlignments.has(key) ||
            bestVerticalAlignments.get(key).distance > distance) {

          // Define extent of the vertical line
          const minY = Math.min(activeTop, otherTop) - 20;
          const maxY = Math.max(activeBottom, otherBottom) + 20;

          bestVerticalAlignments.set(key, {
            distance,
            priority: align.priority,
            line: {
              startX: align.value,
              startY: minY,
              length: maxY - minY,
              isVertical: true
            },
            newX: align.newX
          });
        }
      }
    }

    // Check horizontal alignments (y-axis)
    const horizontalAlignments = [
      { value: otherTop, type: "top-to-top", active: activeTop, priority: 1,
        newY: isSelection ? otherTop - padding : otherTop },
      { value: otherBottom, type: "bottom-to-bottom", active: activeBottom, priority: 1,
        newY: isSelection ? otherBottom - movingItem.height + padding : otherBottom - movingItem.height },
      { value: otherCenterY, type: "center-y", active: activeCenterY, priority: 2,
        newY: isSelection ? otherCenterY - (movingItem.height / 2) : otherCenterY - (movingItem.height / 2) },
      { value: otherCenterY, type: "top-to-center", active: activeTop, priority: 3,
        newY: isSelection ? otherCenterY - padding : otherCenterY },
      { value: otherCenterY, type: "bottom-to-center", active: activeBottom, priority: 3,
        newY: isSelection ? otherCenterY - movingItem.height + padding : otherCenterY - movingItem.height },
      { value: otherBottom, type: "top-to-bottom", active: activeTop, priority: 4,
        newY: isSelection ? otherBottom - padding : otherBottom },
      { value: otherTop, type: "bottom-to-top", active: activeBottom, priority: 4,
        newY: isSelection ? otherTop - movingItem.height + padding : otherTop - movingItem.height }
    ];

    for (const align of horizontalAlignments) {
      const distance = Math.abs(align.active - align.value);
      if (distance < snapThreshold && distance <= bestYSnapDistance) {
        const key = align.type;

        if (distance < bestYSnapDistance) {
          bestYSnapDistance = distance;
          bestHorizontalAlignments.clear();
        }

        if (!bestHorizontalAlignments.has(key) ||
            bestHorizontalAlignments.get(key).distance > distance) {

          // Define extent of the horizontal line
          const minX = Math.min(activeLeft, otherLeft) - 20;
          const maxX = Math.max(activeRight, otherRight) + 20;

          bestHorizontalAlignments.set(key, {
            distance,
            priority: align.priority,
            line: {
              startX: minX,
              startY: align.value,
              length: maxX - minX,
              isVertical: false
            },
            newY: align.newY
          });
        }
      }
    }
  }

  // Get the best vertical alignment
  if (bestVerticalAlignments.size > 0) {
    let bestAlign = null;
    for (const [_, align] of bestVerticalAlignments) {
      if (!bestAlign || align.priority < bestAlign.priority) {
        bestAlign = align;
      }
    }
    if (bestAlign) {
      snapLines.push(bestAlign.line);
      snappedPosition.x = bestAlign.newX;
    }
  }

  // Get the best horizontal alignment
  if (bestHorizontalAlignments.size > 0) {
    let bestAlign = null;
    for (const [_, align] of bestHorizontalAlignments) {
      if (!bestAlign || align.priority < bestAlign.priority) {
        bestAlign = align;
      }
    }
    if (bestAlign) {
      snapLines.push(bestAlign.line);
      snappedPosition.y = bestAlign.newY;
    }
  }

  return {
    snapLines,
    snappedPosition
  };
}
