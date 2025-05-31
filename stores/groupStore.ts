import { defineStore } from 'pinia'
import { customAlphabet } from 'nanoid'
import { useBoardStore } from './board'
import { useItemStore } from './itemStore'
import type { Position } from '~/types/board'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

interface GroupItem {
  id: string
  kind: 'group'
  content: {
    itemIds: string[]
    label: string
  }
  x_position: number
  y_position: number
  width: number
  height: number
  displayName?: string
  lock?: boolean
}

export const useGroupStore = defineStore('groups', () => {
  const boardStore = useBoardStore()
  const itemStore = useItemStore()

  // Create a group from selected items
  const createGroupFromSelected = () => {
    if (!boardStore.board) return null

    const selectedItems = itemStore.getSelectedItems()
    if (!selectedItems || selectedItems.length < 2) return null

    // Calculate bounds for the group
    const bounds = calculateGroupBounds(selectedItems)

    // Create the group
    const newGroup: GroupItem = {
      id: `GROUP-${nanoid(10)}`,
      kind: 'group',
      content: {
        itemIds: selectedItems.map(item => item.id),
        label: `Group (${selectedItems.length} items)`
      },
      x_position: bounds.x,
      y_position: bounds.y,
      width: bounds.width,
      height: bounds.height,
      displayName: 'Group',
      lock: false
    }

    // Add group to board
    boardStore.addBoardItem(newGroup)

    // Clear selection
    boardStore.setSelectedId(null)

    // Select the new group
    boardStore.setSelectedId(newGroup.id)

    boardStore.debouncedSaveBoard()
    return newGroup
  }

  // Ungroup items - remove group and restore individual selection
  const ungroupItems = (groupId: string) => {
    if (!boardStore.board) return

    const group = boardStore.board.data.items.find(
      item => item.id === groupId && item.kind === 'group'
    ) as GroupItem | undefined

    if (!group) return

    // Get the item IDs from the group
    const itemIds = group.content.itemIds

    // Remove the group from the board
    boardStore.board.data.items = boardStore.board.data.items.filter(
      item => item.id !== groupId
    )

    // Select the ungrouped items
    boardStore.setSelectedId(null)
    itemIds.forEach(itemId => {
      boardStore.setSelectedId(itemId, true)
    })

    boardStore.debouncedSaveBoard()
  }

  // Calculate group bounds from items
  const calculateGroupBounds = (items: any[], padding: number = 20) => {
    if (items.length === 0) return { x: 0, y: 0, width: 100, height: 100 }

    let minX = items[0].x_position
    let minY = items[0].y_position
    let maxX = items[0].x_position + items[0].width
    let maxY = items[0].y_position + items[0].height

    items.forEach(item => {
      minX = Math.min(minX, item.x_position)
      minY = Math.min(minY, item.y_position)
      maxX = Math.max(maxX, item.x_position + item.width)
      maxY = Math.max(maxY, item.y_position + item.height)
    })

    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + (padding * 2),
      height: maxY - minY + (padding * 2)
    }
  }

  // Add item to group
  const addItemToGroup = (groupId: string, itemId: string) => {
    if (!boardStore.board) return false

    const group = boardStore.board.data.items.find(
      item => item.id === groupId && item.kind === 'group'
    ) as GroupItem | undefined

    if (!group || group.content.itemIds.includes(itemId)) return false

    // Add item to group
    group.content.itemIds.push(itemId)

    // Update group label
    group.content.label = `Group (${group.content.itemIds.length} items)`

    // Recalculate group bounds
    recalculateGroupBounds(groupId,30)

    boardStore.debouncedSaveBoard()
    return true
  }

  // Remove item from group
  const removeItemFromGroup = (groupId: string, itemId: string) => {
    if (!boardStore.board) return false

    const group = boardStore.board.data.items.find(
      item => item.id === groupId && item.kind === 'group'
    ) as GroupItem | undefined

    if (!group) return false

    // Remove item from group
    group.content.itemIds = group.content.itemIds.filter(id => id !== itemId)

    // Update group label
    group.content.label = `Group (${group.content.itemIds.length} items)`

    // If group is empty or has only one item, remove the group
    if (group.content.itemIds.length <= 1) {
      ungroupItems(groupId)
      return true
    }

    // Recalculate group bounds
    recalculateGroupBounds(groupId)

    boardStore.debouncedSaveBoard()
    return true
  }

  // Recalculate group bounds based on current items
  const recalculateGroupBounds = (groupId: string, padding: number = 20) => {
    if (!boardStore.board) return

    const group = boardStore.board.data.items.find(
      item => item.id === groupId && item.kind === 'group'
    ) as GroupItem | undefined

    if (!group) return

    // Get all items in the group
    const groupItems = boardStore.board.data.items.filter(item =>
      group.content.itemIds.includes(item.id) && item.kind !== 'group'
    )

    if (groupItems.length === 0) return

    // Calculate new bounds
    const bounds = calculateGroupBounds(groupItems, padding)

    // Update group position and size
    group.x_position = bounds.x
    group.y_position = bounds.y
    group.width = bounds.width
    group.height = bounds.height
  }

  // Check if 50% of an item overlaps with a group
  const checkOverlap = (itemRect: any, groupRect: any) => {
    const itemArea = itemRect.width * itemRect.height

    // Calculate intersection
    const left = Math.max(itemRect.x, groupRect.x)
    const right = Math.min(itemRect.x + itemRect.width, groupRect.x + groupRect.width)
    const top = Math.max(itemRect.y, groupRect.y)
    const bottom = Math.min(itemRect.y + itemRect.height, groupRect.y + groupRect.height)

    if (left >= right || top >= bottom) {
      return 0 // No overlap
    }

    const intersectionArea = (right - left) * (bottom - top)
    return intersectionArea / itemArea
  }

  // Process group interactions during item movement
  const processGroupInteractions = (movingItemId: string, itemRect: any) => {
    if (!boardStore.board) return

    // Get all groups
    const groups = boardStore.board.data.items.filter(item => item.kind === 'group') as GroupItem[]

    groups.forEach(group => {
      const groupRect = {
        x: group.x_position,
        y: group.y_position,
        width: group.width,
        height: group.height
      }

      const overlapRatio = checkOverlap(itemRect, groupRect)
      const isItemInGroup = group.content.itemIds.includes(movingItemId)

      if (overlapRatio >= 0.05 && !isItemInGroup) {
        // Add item to group if 5% overlap and not already in group
        addItemToGroup(group.id, movingItemId)
      } else if (overlapRatio < 0.5 && isItemInGroup) {
        // Remove item from group if less than 50% overlap and currently in group
        removeItemFromGroup(group.id, movingItemId)
      }
    })
  }
  // Check if an item is part of any group
  const isItemInAnyGroup = (itemId: string): boolean => {
    if (!boardStore.board) return false

    const groups = boardStore.board.data.items.filter(item => item.kind === 'group') as GroupItem[]
    return groups.some(group => group.content.itemIds.includes(itemId))
  }

  // Get items that are not in any group
  const filterItemsNotInGroups = (items: any[]): any[] => {
    return items.filter(item => !isItemInAnyGroup(item.id))
  }


  return {
    createGroupFromSelected,
     ungroupItems,
     calculateGroupBounds,
     addItemToGroup,
     removeItemFromGroup,
     recalculateGroupBounds,
     processGroupInteractions,
     isItemInAnyGroup,
     filterItemsNotInGroups
  }

})
