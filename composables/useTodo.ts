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
// Unified drag state
const dragState = reactive({
  // Common state
  draggedItem: null,
  targetIndex: null,
  isDragging: false,
  
  // Element references
  draggedElement: null,
  ghostElement: null,
  
  // Touch-specific state
  touchStartY: 0,
  touchOffsetX: 0,
  touchOffsetY: 0,
  
  // List tracking
  currentListId: null,
  
  reset() {
    // Reset all state
    this.draggedItem = null;
    this.targetIndex = null;
    this.isDragging = false;
    this.draggedElement = null;
    this.currentListId = null;
    
    // Clean up ghost element
    if (this.ghostElement) {
      document.body.removeChild(this.ghostElement);
      this.ghostElement = null;
    }
    
    // Remove all visual indicators
    document.querySelectorAll('.dragged-item, .item-drag, .list-drop').forEach(el => {
      el.classList.remove('dragged-item', 'item-drag', 'list-drop');
    });
  }
});

// Mouse drag handlers
function handleDragStart(event, listID, itemIndex, task) {
  // Reset any previous state
  dragState.reset();
  
  // Set current drag state
  dragState.draggedItem = itemIndex;
  dragState.currentListId = listID;
  dragState.draggedElement = event.target;
  
  // Add visual indicator
  dragState.draggedElement.classList.add('dragged-item');
  
  // Set board store data
  boardStore.fromListId = listID;
  boardStore.draggedTask = task;
}

function handleDragOver(event, listID, itemIndex) {
  event.preventDefault(); // Ensure drop is allowed
  
  const targetElem = event.target;
  
  // Clear previous highlights first
  document.querySelectorAll('.item-drag').forEach(el => {
    el.classList.remove('item-drag');
  });
  
  // Add highlight to current target if it's a task item
  if (targetElem?.classList.contains('taskItem')) {
    targetElem.classList.add('item-drag');
  }
  
  // Handle list highlighting
  const todoList = targetElem.closest('.taskContaner');
  if (todoList) {
    // Remove previous list highlights
    document.querySelectorAll('.list-drop').forEach(el => {
      el.classList.remove('list-drop');
    });
    
    // Only highlight if dragging between different lists
    if (listID !== boardStore.fromListId) {
      todoList.classList.add('list-drop');
    }
  }
  
  // Update target indices
  dragState.targetIndex = itemIndex;
  boardStore.targetIndex = itemIndex;
}

function handleDragEnd() {
  dragState.reset();
}

function handleDragLeave(event) {
  // Only remove highlight from the element being left
  const target = event.target;
  if (target.classList.contains('item-drag')) {
    target.classList.remove('item-drag');
  }
}

function handleDrop(event, listID,list) {
  event.preventDefault();
  
  // Handle cross-list move
  if (boardStore.fromListId && boardStore.fromListId !== listID) {
    todoStore.moveTaskBetweenLists(
      boardStore.fromListId,
      boardStore.draggedTask?.task_id,
      listID,
      boardStore.targetIndex !== null ? boardStore.targetIndex : 0
    );
  } 
  // Handle same-list reordering
  else if (dragState.draggedItem !== null && dragState.targetIndex !== null) {
    const newTasks = [list.content.tasks];
    const movedItem = newTasks[dragState.draggedItem];
    
    // Remove from original position and insert at new position
    newTasks.splice(dragState.draggedItem, 1);
    newTasks.splice(dragState.targetIndex, 0, movedItem);
    
    todoStore.reorderTasks(listID, newTasks);
  }
  
  // Reset all state
  dragState.reset();
  boardStore.fromListId = null;
  boardStore.draggedTask = null;
  boardStore.targetIndex = null;
}

// Touch event handlers
function handleTouchStart(event, listID, itemIndex, task) {
  // Ensure we have a touch event
  if (!event.touches || event.touches.length === 0) return;
  
  const touch = event.touches[0];
  const targetElement = event.target.closest('.taskItem');
  
  if (!targetElement) return;
  
  // Store initial touch data
  dragState.draggedItem = itemIndex;
  dragState.currentListId = listID;
  dragState.touchStartY = touch.clientY;
  dragState.draggedElement = targetElement;
  
  // Set board store data
  boardStore.fromListId = listID;
  boardStore.draggedTask = task;
  
  // Calculate touch offset relative to element
  const rect = targetElement.getBoundingClientRect();
  dragState.touchOffsetX = touch.clientX - rect.left;
  dragState.touchOffsetY = touch.clientY - rect.top;
  
  // Add visual indication
  targetElement.classList.add('dragged-item');
}

function handleTouchMove(event) {
  // Validate state
  if (!dragState.draggedElement || dragState.draggedItem === null) return;
  if (!event.touches || event.touches.length === 0) return;
  
  // Prevent scrolling while dragging
  event.preventDefault();
  
  const touch = event.touches[0];
  const touchX = touch.clientX;
  const touchY = touch.clientY;
  
  // Only start dragging after a small movement threshold
  const moved = Math.abs(touchY - dragState.touchStartY);
  
  if (moved > 5) {
    if (!dragState.isDragging) {
      dragState.isDragging = true;
      createGhostElement(dragState.draggedElement, touchX, touchY);
    }
    
    if (dragState.isDragging && dragState.ghostElement) {
      moveGhostElement(touchX, touchY);
    }
    
    // Find element under touch point (temporarily hide ghost)
    if (dragState.ghostElement) {
      dragState.ghostElement.style.display = 'none';
    }
    
    const elemBelow = document.elementFromPoint(touchX, touchY);
    
    // Show ghost again
    if (dragState.ghostElement) {
      dragState.ghostElement.style.display = 'flex';
    }
    
    if (!elemBelow) return;
    
    // Handle task item targeting
    const taskItem = elemBelow.closest('.taskItem');
    if (taskItem) {
      // Clear previous highlights
      document.querySelectorAll('.item-drag').forEach(el => {
        el.classList.remove('item-drag');
      });
      
      // Add highlight to current target
      taskItem.classList.add('item-drag');
      
      // Get the index from the taskItem
      const items = Array.from(taskItem.parentElement.children);
      const hoverIndex = items.indexOf(taskItem);
      
      if (hoverIndex >= 0) {
        dragState.targetIndex = hoverIndex;
        boardStore.targetIndex = hoverIndex;
      }
    }
    
    // Handle list targeting
    const todoList = elemBelow.closest('.taskContaner');
    if (todoList) {
      const listId = todoList.getAttribute('data-list-id');
      if (listId) {
        // Remove previous list highlights
        document.querySelectorAll('.list-drop').forEach(el => {
          el.classList.remove('list-drop');
        });
        
        // Only highlight if dragging between different lists
        if (listId !== boardStore.fromListId) {
          todoList.classList.add('list-drop');
          
          // If list is empty, set target index to 0
          const listItems = todoList.querySelectorAll('.taskItem');
          if (listItems.length === 0) {
            boardStore.targetIndex = 0;
          }
        }
      }
    }
  }
}

function handleTouchEnd(event, listID,list) {
  // If we weren't actively dragging, just reset
  if (!dragState.isDragging || dragState.draggedItem === null) {
    dragState.reset();
    return;
  }
  
  // Determine final drop target
  let targetListID = listID;
  
  if (event.changedTouches && event.changedTouches.length > 0) {
    const touch = event.changedTouches[0];
    
    // Hide ghost to find element below
    if (dragState.ghostElement) {
      dragState.ghostElement.style.display = 'none';
    }
    
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elemBelow) {
      const todoList = elemBelow.closest('.taskContaner');
      if (todoList) {
        const listId = todoList.getAttribute('data-list-id');
        if (listId) {
          targetListID = listId;
        }
      }
    }
  }
  
  // Perform the drop action
  if (boardStore.fromListId && boardStore.fromListId !== targetListID) {
    // Cross-list move
    todoStore.moveTaskBetweenLists(
      boardStore.fromListId,
      boardStore.draggedTask?.task_id,
      targetListID,
      boardStore.targetIndex !== null ? boardStore.targetIndex : 0
    );
  } else if (dragState.draggedItem !== null && dragState.targetIndex !== null) {
    // Same-list reordering
    const newTasks = [list.content.tasks];
    const movedItem = newTasks[dragState.draggedItem];
    
    newTasks.splice(dragState.draggedItem, 1);
    newTasks.splice(dragState.targetIndex, 0, movedItem);
    
    todoStore.reorderTasks(targetListID, newTasks);
  }
  
  // Reset all state
  dragState.reset();
  boardStore.fromListId = null;
  boardStore.draggedTask = null;
  boardStore.targetIndex = null;
}

// Helper functions for ghost element
function createGhostElement(sourceElement, touchX, touchY) {
  // Create clone of dragged element
  const ghost = sourceElement.cloneNode(true);
  
  // Apply styles to ghost
  Object.assign(ghost.style, {
    position: 'fixed',
    top: `${touchY - dragState.touchOffsetY}px`,
    left: `${touchX - dragState.touchOffsetX}px`,
    width: `${sourceElement.offsetWidth}px`,
    opacity: '0.7',
    pointerEvents: 'none',
    zIndex: '1000',
    transform: 'scale(0.95)',
    transition: 'transform 100ms ease',
    backgroundColor: 'white',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    borderRadius: '4px',
    display: 'flex'
  });
  
  // Add ghost to body
  document.body.appendChild(ghost);
  dragState.ghostElement = ghost;
}

function moveGhostElement(touchX, touchY) {
  if (!dragState.ghostElement) return;
  
  dragState.ghostElement.style.top = `${touchY - dragState.touchOffsetY}px`;
  dragState.ghostElement.style.left = `${touchX - dragState.touchOffsetX}px`;
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

    // Drag and drop
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragLeave,
    handleDrop,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }
}