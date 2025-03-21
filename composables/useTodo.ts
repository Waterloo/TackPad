import { ref, nextTick } from 'vue'
import { useTodoStore } from '~/stores/todoStore'
import { useBoardStore } from '~/stores/board'
import type { TodoList, Task } from '~/types/board'

export const useTodo = (list: TodoList) => {
  const todoStore = useTodoStore()
  const boardStore = useBoardStore()
  
  // Task editing state
  const editingTaskId = ref<string | null>(null)
  const editingContent = ref('')
  const editInput = ref<HTMLInputElement | null>(null)
  
  // Title editing state
  const localTitle = ref(list.content.title)
  const isEditingTitle = ref(false)
  const titleInput = ref<HTMLInputElement | null>(null)
  
  // Drag and drop state
  const draggedItemIndex = ref<number | null>(null)
  const isDragging = ref(false)
  const dropIndex = ref<number | null>(null)
  
  // Touch drag state
  const touchStartX = ref(0)
  const touchStartY = ref(0)
  const touchDragging = ref(false)
  const touchTarget = ref<HTMLElement | null>(null)
  const touchDraggedElement = ref<HTMLElement | null>(null)
  const touchDraggedIndex = ref<number | null>(null)
  const touchListId = ref<string | null>(null)
  const touchDragThreshold = 10 // Minimum pixels to move before considering it a drag
  
  // Title functions
  const startTitleEdit = () => {
    isEditingTitle.value = true
    nextTick(() => {
      titleInput.value?.focus()
    })
  }

  const saveTitle = () => {
    if (localTitle.value.trim() === '') {
      localTitle.value = list.content.title
    } else if (localTitle.value !== list.content.title) {
      todoStore.updateTodoTitle(list.id, localTitle.value)
    }
    isEditingTitle.value = false
  }

  const cancelTitleEdit = () => {
    localTitle.value = list.content.title
    isEditingTitle.value = false
  }
  
  // Task functions
  const addNewTask = (taskContent: string) => {
    if (!taskContent.trim()) return
    todoStore.addTask(list.id, taskContent)
    return ''
  }

  const deleteTask = (task: Task) => {
    todoStore.deleteTask(list.id, task.task_id)
  }

  const toggleTask = (task: Task) => {
    todoStore.toggleTaskCompletion(list.id, task.task_id)
  }

  const startEditing = (task: Task) => {
    editingTaskId.value = task.task_id
    editingContent.value = task.content
    nextTick(() => {
      editInput.value?.focus()
    })
  }

  const saveTaskEdit = (task: Task) => {
    if (editingTaskId.value === null) return
    if (editingContent.value.trim() !== '') {
      todoStore.updateTask(list.id, task.task_id, editingContent.value)
    }
    editingTaskId.value = null
    editingContent.value = ''
  }

  const cancelTaskEdit = () => {
    editingTaskId.value = null
    editingContent.value = ''
  }

  
  // Drag and drop functions
  const dragStart = (index: number, event: DragEvent) => {
    isDragging.value = true
    draggedItemIndex.value = index
    if(boardStore.fromListId === null){
        boardStore.fromListId = list.id
        // Store the task being dragged
        boardStore.draggedTask = list.content.tasks[index]
    }
    
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
      
      // Find the drag handle element which is the direct child of the li
      const listItem = event.currentTarget as HTMLElement;
      if (listItem) {
        // Calculate offset for better positioning
        const rect = listItem.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        
        // Use the list item itself as the drag image
        event.dataTransfer.setDragImage(listItem, offsetX, offsetY);
      }
    }
  }

  const drop = (dropIndex: number, event: DragEvent) => {
    event.preventDefault()
    
    const target = event.target as HTMLElement
    const targetListId = target.closest('[data-list-id]')?.dataset.listId
   
    if(boardStore.fromListId !== targetListId && targetListId) {
     boardStore.toListId = targetListId 
    }

    // Handle cross-list drag and drop
    if(boardStore.fromListId && boardStore.toListId && boardStore.draggedTask) {
      console.log('from', boardStore.fromListId)
      console.log('to', boardStore.toListId)
      
      // For the target list, add the task
      if(list.id === boardStore.toListId) {
        // Add task to the target list
        todoStore.addTask(list.id, boardStore.draggedTask.content)
        
        // Delete from source list - do this here to ensure it happens
        todoStore.deleteTask(boardStore.fromListId, boardStore.draggedTask.task_id)
      }
    } else {
      // Same-list reordering
      if(draggedItemIndex.value === null) return

      // Create a copy of the tasks array
      const newTasks = [...list.content.tasks]
      
      // Get the task that was being dragged
      const draggedTask = newTasks[draggedItemIndex.value]
      
      // Remove the task from its original position
      newTasks.splice(draggedItemIndex.value, 1)
      
      // Insert the task at the new position
      newTasks.splice(dropIndex, 0, draggedTask)
      
      // Update the store with the new order
      todoStore.reorderTasks(list.id, newTasks)
    }
    
    // Reset the dragged item index
    draggedItemIndex.value = null
    isDragging.value = false
    boardStore.fromListId = null
    boardStore.toListId = null
    boardStore.draggedTask = null
  }

  const dragOver = (index: number) => {
    dropIndex.value = index
  }

  const dragEnd = () => {
    // Clean up any drag state
    isDragging.value = false
    draggedItemIndex.value = null
    dropIndex.value = null
  }

  // Touch event handlers
  const touchStart = (index: number, event: TouchEvent) => {
    // Store initial touch position
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      touchStartX.value = touch.clientX
      touchStartY.value = touch.clientY
      touchDraggedIndex.value = index
      touchTarget.value = event.currentTarget as HTMLElement
      touchListId.value = list.id
    }
  }

  const touchMove = (event: TouchEvent) => {
    if (!touchTarget.value || touchDraggedIndex.value === null || event.touches.length !== 1) return
    
    const touch = event.touches[0]
    const deltaX = touch.clientX - touchStartX.value
    const deltaY = touch.clientY - touchStartY.value
    
    // Check if we've moved enough to consider it a drag
    if (!touchDragging.value) {
      if (Math.abs(deltaX) > touchDragThreshold || Math.abs(deltaY) > touchDragThreshold) {
        touchDragging.value = true
        
        // Set up dragging state
        isDragging.value = true
        draggedItemIndex.value = touchDraggedIndex.value
        
        // Create a visual clone for dragging
        touchDraggedElement.value = touchTarget.value.cloneNode(true) as HTMLElement
        document.body.appendChild(touchDraggedElement.value)
        
        // Style the clone
        const rect = touchTarget.value.getBoundingClientRect()
        touchDraggedElement.value.style.position = 'fixed'
        touchDraggedElement.value.style.top = `${rect.top}px`
        touchDraggedElement.value.style.left = `${rect.left}px`
        touchDraggedElement.value.style.width = `${rect.width}px`
        touchDraggedElement.value.style.zIndex = '1000'
        touchDraggedElement.value.style.opacity = '0.8'
        touchDraggedElement.value.style.pointerEvents = 'none'
        touchDraggedElement.value.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)'
        touchDraggedElement.value.style.transform = 'scale(1.02)'
        
        // Set board store state for cross-list drag
        if (boardStore.fromListId === null) {
          boardStore.fromListId = list.id
          boardStore.draggedTask = list.content.tasks[touchDraggedIndex.value]
        }
        
        // Add dragging class to original element
        touchTarget.value.classList.add('dragging')
      }
    }
    
    // If we're dragging, move the clone and detect potential drop targets
    if (touchDragging.value && touchDraggedElement.value) {
      event.preventDefault() // Prevent scrolling while dragging
      
      // Move the clone
      touchDraggedElement.value.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.02)`
      
      // Find the element we're hovering over
      const elementsUnderTouch = document.elementsFromPoint(touch.clientX, touch.clientY)
      
      // Find list items under the touch point
      const listItemUnderTouch = elementsUnderTouch.find(el => 
        el.tagName === 'LI' && el.hasAttribute('draggable') && el !== touchTarget.value
      ) as HTMLElement | undefined
      
      // Find list container under the touch point
      const listContainerUnderTouch = elementsUnderTouch.find(el => 
        el.tagName === 'UL' && el.hasAttribute('data-list-id')
      ) as HTMLElement | undefined
      
      // Reset previous drop target indicators
      document.querySelectorAll('.drag-over').forEach(el => {
        if (el !== touchTarget.value) el.classList.remove('drag-over')
      })
      
      // Handle hovering over another list item
      if (listItemUnderTouch) {
        const hoverIndex = Array.from(listItemUnderTouch.parentElement?.children || []).indexOf(listItemUnderTouch)
        dropIndex.value = hoverIndex
        listItemUnderTouch.classList.add('drag-over')
        
        // Get the list ID we're hovering over
        const targetListId = listItemUnderTouch.closest('[data-list-id]')?.getAttribute('data-list-id') || null
        if (targetListId && targetListId !== touchListId.value) {
          boardStore.toListId = targetListId
        }
      } 
      // Handle hovering over an empty list
      else if (listContainerUnderTouch) {
        const targetListId = listContainerUnderTouch.getAttribute('data-list-id') || null
        const listItems = listContainerUnderTouch.querySelectorAll('li[draggable="true"]')
        
        if (targetListId && targetListId !== touchListId.value) {
          boardStore.toListId = targetListId
          
          // If the list is empty, show drop indicator
          if (listItems.length === 0) {
            listContainerUnderTouch.classList.add('empty-list-drag-over')
          }
        }
      }
    }
  }

  const touchEnd = (event: TouchEvent) => {
    if (!touchDragging.value || touchDraggedIndex.value === null) {
      // Reset touch state without performing a drop
      resetTouchState()
      return
    }
    
    // Find the element we're dropping onto
    const touch = event.changedTouches[0]
    const elementsUnderTouch = document.elementsFromPoint(touch.clientX, touch.clientY)
    
    // Find list item under the touch point
    const listItemUnderTouch = elementsUnderTouch.find(el => 
      el.tagName === 'LI' && el.hasAttribute('draggable') && el !== touchTarget.value
    ) as HTMLElement | undefined
    
    // Find list container under the touch point
    const listContainerUnderTouch = elementsUnderTouch.find(el => 
      el.tagName === 'UL' && el.hasAttribute('data-list-id')
    ) as HTMLElement | undefined
    
    if (listItemUnderTouch) {
      // Get the index of the item we're dropping onto
      const dropTargetIndex = Array.from(listItemUnderTouch.parentElement?.children || []).indexOf(listItemUnderTouch)
      
      // Get the list ID we're dropping onto
      const targetListId = listItemUnderTouch.closest('[data-list-id]')?.getAttribute('data-list-id') || null
      
      if (targetListId) {
        // Handle cross-list drop
        if (targetListId !== touchListId.value) {
          boardStore.toListId = targetListId
          
          // For the target list, add the task
          if (boardStore.fromListId && boardStore.toListId && boardStore.draggedTask) {
            // Add task to the target list
            todoStore.addTask(boardStore.toListId, boardStore.draggedTask.content)
            
            // Delete from source list
            todoStore.deleteTask(boardStore.fromListId, boardStore.draggedTask.task_id)
          }
        } else {
          // Same-list reordering
          // Create a copy of the tasks array
          const newTasks = [...list.content.tasks]
          
          // Get the task that was being dragged
          const draggedTask = newTasks[touchDraggedIndex.value]
          
          // Remove the task from its original position
          newTasks.splice(touchDraggedIndex.value, 1)
          
          // Insert the task at the new position
          newTasks.splice(dropTargetIndex, 0, draggedTask)
          
          // Update the store with the new order
          todoStore.reorderTasks(list.id, newTasks)
        }
      }
    } 
    // Handle dropping onto an empty list
    else if (listContainerUnderTouch) {
      const targetListId = listContainerUnderTouch.getAttribute('data-list-id') || null
      const listItems = listContainerUnderTouch.querySelectorAll('li[draggable="true"]')
      
      if (targetListId && targetListId !== touchListId.value && listItems.length === 0) {
        boardStore.toListId = targetListId
        
        // Handle cross-list drop to empty list
        if (boardStore.fromListId && boardStore.toListId && boardStore.draggedTask) {
          // Add task to the target list
          todoStore.addTask(boardStore.toListId, boardStore.draggedTask.content)
          
          // Delete from source list
          todoStore.deleteTask(boardStore.fromListId, boardStore.draggedTask.task_id)
        }
      }
    }
    
    // Reset all state
    resetTouchState()
  }

  const touchCancel = () => {
    resetTouchState()
  }

  const resetTouchState = () => {
    // Remove the dragged element clone if it exists
    if (touchDraggedElement.value && touchDraggedElement.value.parentNode) {
      touchDraggedElement.value.parentNode.removeChild(touchDraggedElement.value)
    }
    
    // Reset touch state
    touchDragging.value = false
    touchTarget.value?.classList.remove('dragging')
    touchDraggedElement.value = null
    touchDraggedIndex.value = null
    touchListId.value = null
    
    // Reset drag state
    isDragging.value = false
    draggedItemIndex.value = null
    dropIndex.value = null
    
    // Reset board store state
    boardStore.fromListId = null
    boardStore.toListId = null
    boardStore.draggedTask = null
    
    // Remove any drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over')
    })
    
    // Remove any empty-list-drag-over classes
    document.querySelectorAll('.empty-list-drag-over').forEach(el => {
      el.classList.remove('empty-list-drag-over')
    })
  }

  return {
    // State
    localTitle,
    isEditingTitle,
    titleInput,
    editingTaskId,
    editingContent,
    editInput,
    draggedItemIndex,
    isDragging,
    dropIndex,
    
    // Title functions
    startTitleEdit,
    saveTitle,
    cancelTitleEdit,
    
    // Task functions
    addNewTask,
    deleteTask,
    toggleTask,
    startEditing,
    saveTaskEdit,
    cancelTaskEdit,
    
    // Drag and drop functions
    dragStart,
    drop,
    dragOver,
    dragEnd,
    
    // Touch drag and drop functions
    touchStart,
    touchMove,
    touchEnd,
    touchCancel
  }
}