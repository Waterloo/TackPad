// stores/todoStore.ts
import { defineStore } from 'pinia'
import { customAlphabet } from 'nanoid'
import { useBoardStore } from './board'
import type { TodoList, Task, Position } from '~/types/board'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export const useTodoStore = defineStore('todos', () => {
  // Get reference to the board store
  const boardStore = useBoardStore()

  // Add a todo list
  const addTodoList = (position: Position) => {
    if (!boardStore.board) return null

    const newTodo: TodoList = {
      id: `TODO-${nanoid(10)}`,
      kind: 'todo',
      content: {
        title: 'Todo List',
        tasks: []
      },
      x_position: position.x,
      y_position: position.y,
      width: position.width || 300,
      height: position.height || 300,
    }

    boardStore.addBoardItem(newTodo)
    boardStore.debouncedSaveBoard()
    return newTodo
  }




  // Update todo list title
  const updateTodoTitle = (listId: string, title: string) => {
    if (!boardStore.board) return

    // Use Map.get() for O(1) lookup
    const list = boardStore.board.data.items.get(listId);

    if (list && list.kind === 'todo') {
      // Create updated list with new title
      const updatedList = {
        ...list,
        content: {
          ...list.content,
          title
        }
      };
      boardStore.board.data.items.set(listId, updatedList);
      boardStore.debouncedSaveBoard();
    }
  }

  // Add a task to a todo list
  const addTask = (listId: string, content: string | {text: string, completed?: boolean}) => {
    if (!boardStore.board) return null

    // Use Map.get() for O(1) lookup
    const list = boardStore.board.data.items.get(listId);

    if (!list || list.kind !== 'todo') return null

    let newTask: Task;
    if (typeof content === 'string') {
      newTask = {
        task_id: `TASK-${nanoid(10)}`,
        content,
        completed: false,
      }
    } else if (content.text) {
      newTask = {
        task_id: `TASK-${nanoid(10)}`,
        content: content.text,
        completed: Boolean(content.completed),
      }
    } else {
      return null;
    }

    // Create updated list with new task
    const updatedList = {
      ...list,
      content: {
        ...list.content,
        tasks: [...list.content.tasks, newTask]
      }
    };

    boardStore.board.data.items.set(listId, updatedList);
    boardStore.debouncedSaveBoard();
    return newTask;
  }

  // Update a task
  const updateTask = (listId: string, taskId: string, content: string) => {
    if (!boardStore.board) return

    // Use Map.get() for O(1) lookup
    const list = boardStore.board.data.items.get(listId);

    if (!list || list.kind !== 'todo') return

    const updatedTasks = list.content.tasks.map(task =>
      task.task_id === taskId ? { ...task, content } : task
    );

    // Create updated list with modified task
    const updatedList = {
      ...list,
      content: {
        ...list.content,
        tasks: updatedTasks
      }
    };

    boardStore.board.data.items.set(listId, updatedList);
    boardStore.debouncedSaveBoard();
  }

  // Toggle task completion
  const toggleTaskCompletion = (listId: string, taskId: string) => {
    if (!boardStore.board) return

    // Use Map.get() for O(1) lookup
    const list = boardStore.board.data.items.get(listId);

    if (!list || list.kind !== 'todo') return

    const updatedTasks = list.content.tasks.map(task =>
      task.task_id === taskId ? { ...task, completed: !task.completed } : task
    );

    // Create updated list with toggled task
    const updatedList = {
      ...list,
      content: {
        ...list.content,
        tasks: updatedTasks
      }
    };

    boardStore.board.data.items.set(listId, updatedList);
    boardStore.debouncedSaveBoard();
  }


  // Delete a task
  const deleteTask = (listId: string, taskId: string) => {
    if (!boardStore.board) return

    // Use Map.get() for O(1) lookup
    const list = boardStore.board.data.items.get(listId);

    if (!list || list.kind !== 'todo') return

    // Create updated list without the deleted task
    const updatedList = {
      ...list,
      content: {
        ...list.content,
        tasks: list.content.tasks.filter(task => task.task_id !== taskId)
      }
    };

    boardStore.board.data.items.set(listId, updatedList);
    boardStore.debouncedSaveBoard();
  }



  // Reorder tasks after drag and drop
  const reorderTasks = (listId: string, newTasksOrder: Task[]) => {
    if (!boardStore.board) return

    // Use Map.get() for O(1) lookup
    const list = boardStore.board.data.items.get(listId);

    if (!list || list.kind !== 'todo') return

    // Create updated list with new task order
    const updatedList = {
      ...list,
      content: {
        ...list.content,
        tasks: [...newTasksOrder]
      }
    };

    boardStore.board.data.items.set(listId, updatedList);
    boardStore.debouncedSaveBoard();
  }



  // Move a task from one list to another
  const moveTaskBetweenLists = (sourceListId: string, taskId: string, targetListId: string, targetIndex: number) => {
    if (!boardStore.board) return

    // Use Map.get() for O(1) lookup
    const sourceList = boardStore.board.data.items.get(sourceListId);
    const targetList = boardStore.board.data.items.get(targetListId);

    if (!sourceList || !targetList || sourceList.kind !== 'todo' || targetList.kind !== 'todo') return

    // Find the task to move
    const taskIndex = sourceList.content.tasks.findIndex(task => task.task_id === taskId);
    if (taskIndex === -1) return

    // Get a copy of the task
    const taskToMove = { ...sourceList.content.tasks[taskIndex] };

    // Create updated source list without the task
    const updatedSourceList = {
      ...sourceList,
      content: {
        ...sourceList.content,
        tasks: sourceList.content.tasks.filter(task => task.task_id !== taskId)
      }
    };

    // Create updated target list with the task inserted
    const updatedTargetTasks = [...targetList.content.tasks];
    updatedTargetTasks.splice(targetIndex, 0, taskToMove);

    const updatedTargetList = {
      ...targetList,
      content: {
        ...targetList.content,
        tasks: updatedTargetTasks
      }
    };

    // Update both lists in the Map
    boardStore.board.data.items.set(sourceListId, updatedSourceList);
    boardStore.board.data.items.set(targetListId, updatedTargetList);

    // Save the board
    boardStore.debouncedSaveBoard();
  }


  return {
    addTodoList,
    updateTodoTitle,
    addTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    reorderTasks,
    moveTaskBetweenLists
  }
})
