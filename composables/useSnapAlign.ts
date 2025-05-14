/**
 * Calculate alignment snap lines for an item being moved
 * @param {Object} movingItem - The item being moved (with proposed new position)
 * @param {Array} nearbyItems - Array of nearby items from your spatial index
 * @param {Number} snapThreshold - Distance threshold for snapping in pixels
 * @returns {Object} - { snapLines, snappedPosition }
 */
export function calculateAlignmentGuides(movingItem, nearbyItems, snapThreshold = 10) {
  // Use let instead of const for snapLines so we can reassign it
  let snapLines = [];

  // Start with the proposed position
  let snappedPosition = {
    x: movingItem.x_position,
    y: movingItem.y_position
  };

  // Track best snap distances to prioritize closest alignments
  let bestXSnapDistance = snapThreshold;
  let bestYSnapDistance = snapThreshold;

  // Track vertical and horizontal lines separately
  let verticalLines = [];
  let horizontalLines = [];

  // Calculate edges and center of the moving item
  const activeLeft = movingItem.x_position;
  const activeRight = movingItem.x_position + movingItem.width;
  const activeTop = movingItem.y_position;
  const activeBottom = movingItem.y_position + movingItem.height;
  const activeCenterX = activeLeft + (movingItem.width / 2);
  const activeCenterY = activeTop + (movingItem.height / 2);

  // Check each nearby item for potential alignments
  nearbyItems.forEach(item => {
    if (item.id === movingItem.id) return;

    // Calculate edges and center of the nearby item
    const otherLeft = item.x_position;
    const otherRight = item.x_position + item.width;
    const otherTop = item.y_position;
    const otherBottom = item.y_position + item.height;
    const otherCenterX = otherLeft + (item.width / 2);
    const otherCenterY = otherTop + (item.height / 2);

    // Check vertical alignments (x-axis)
    const verticalAlignments = [
      { active: activeLeft, other: otherLeft, type: "left-to-left", priority: 1 },
      { active: activeRight, other: otherRight, type: "right-to-right", priority: 1 },
      { active: activeCenterX, other: otherCenterX, type: "center-x", priority: 2 },
      { active: activeLeft, other: otherRight, type: "left-to-right", priority: 3 },
      { active: activeRight, other: otherLeft, type: "right-to-left", priority: 3 }
    ];

    for (const align of verticalAlignments) {
      const distance = Math.abs(align.active - align.other);

      if (distance < snapThreshold && distance <= bestXSnapDistance) {
        // If this is a better snap (closer or higher priority), clear previous vertical lines
        if (distance < bestXSnapDistance ||
           (distance === bestXSnapDistance && align.priority < verticalAlignments.find(a => a.active === align.active).priority)) {
          // Clear previous vertical lines
          verticalLines = [];
          bestXSnapDistance = distance;
        }

        // Define extent of the vertical line
        const minY = Math.min(activeTop, otherTop) - 20;
        const maxY = Math.max(activeBottom, otherBottom) + 20;

        // Add the snap line to vertical lines
        verticalLines.push({
          startX: align.other,
          startY: minY,
          length: maxY - minY,
          isVertical: true
        });

        // Update snapped position based on alignment type
        if (align.type === "left-to-left") {
          snappedPosition.x = otherLeft;
        } else if (align.type === "right-to-right") {
          snappedPosition.x = otherRight - movingItem.width;
        } else if (align.type === "left-to-right") {
          snappedPosition.x = otherRight;
        } else if (align.type === "right-to-left") {
          snappedPosition.x = otherLeft - movingItem.width;
        } else if (align.type === "center-x") {
          snappedPosition.x = otherCenterX - (movingItem.width / 2);
        }
      }
    }

    // Check horizontal alignments (y-axis)
    const horizontalAlignments = [
      { active: activeTop, other: otherTop, type: "top-to-top", priority: 1 },
      { active: activeBottom, other: otherBottom, type: "bottom-to-bottom", priority: 1 },
      { active: activeCenterY, other: otherCenterY, type: "center-y", priority: 2 },
      { active: activeTop, other: otherCenterY, type: "top-to-center", priority: 3 },
      { active: activeBottom, other: otherCenterY, type: "bottom-to-center", priority: 3 },
      { active: activeTop, other: otherBottom, type: "top-to-bottom", priority: 4 },
      { active: activeBottom, other: otherTop, type: "bottom-to-top", priority: 4 }
    ];

    for (const align of horizontalAlignments) {
      const distance = Math.abs(align.active - align.other);

      if (distance < snapThreshold && distance <= bestYSnapDistance) {
        // If this is a better snap (closer or higher priority), clear previous horizontal lines
        if (distance < bestYSnapDistance ||
           (distance === bestYSnapDistance && align.priority < horizontalAlignments.find(a => a.active === align.active).priority)) {
          // Clear previous horizontal lines
          horizontalLines = [];
          bestYSnapDistance = distance;
        }

        // Define extent of the horizontal line
        const minX = Math.min(activeLeft, otherLeft) - 20;
        const maxX = Math.max(activeRight, otherRight) + 20;

        // Add the snap line to horizontal lines
        horizontalLines.push({
          startX: minX,
          startY: align.other,
          length: maxX - minX,
          isVertical: false
        });

        // Update snapped position based on alignment type
        if (align.type === "top-to-top") {
          snappedPosition.y = otherTop;
        } else if (align.type === "bottom-to-bottom") {
          snappedPosition.y = otherBottom - movingItem.height;
        } else if (align.type === "top-to-bottom") {
          snappedPosition.y = otherBottom;
        } else if (align.type === "bottom-to-top") {
          snappedPosition.y = otherTop - movingItem.height;
        } else if (align.type === "center-y") {
          snappedPosition.y = otherCenterY - (movingItem.height / 2);
        } else if (align.type === "top-to-center") {
          snappedPosition.y = otherCenterY;
        } else if (align.type === "bottom-to-center") {
          snappedPosition.y = otherCenterY - movingItem.height;
        }
      }
    }
  });

  // Combine vertical and horizontal lines after all checks
  snapLines = [...verticalLines, ...horizontalLines];

  return {
    snapLines,
    snappedPosition
  };
}
