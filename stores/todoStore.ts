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

    boardStore.board.data.items.push(newTodo)
    boardStore.debouncedSaveBoard()
    return newTodo
  }



  // Update todo list title
  const updateTodoTitle = (listId: string, title: string) => {
    if (!boardStore.board) return

    const list = boardStore.board.data.items.find(
      item => item.id === listId && item.kind === 'todo'
    ) as TodoList | undefined
    
    if (list) {
      list.content.title = title
      boardStore.debouncedSaveBoard()
    }
  }
  
  // Add a task to a todo list
  const addTask = (listId: string, content: string | {text: string, completed?: boolean}) => {
    if (!boardStore.board) return null
    
    const list = boardStore.board.data.items.find(
      item => item.id === listId && item.kind === 'todo'
    ) as TodoList | undefined
    
    if (!list) return null

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

    list.content.tasks.push(newTask)
    boardStore.debouncedSaveBoard()
    return newTask
  }
  
  // Update a task
  const updateTask = (listId: string, taskId: string, content: string) => {
    if (!boardStore.board) return

    const list = boardStore.board.data.items.find(
      item => item.id === listId && item.kind === 'todo'
    ) as TodoList | undefined
    
    if (!list) return

    const task = list.content.tasks.find(task => task.task_id === taskId)
    if (task) {
      task.content = content
      boardStore.debouncedSaveBoard()
    }
  }
  
  // Toggle task completion
  const toggleTaskCompletion = (listId: string, taskId: string) => {
    if (!boardStore.board) return

    const list = boardStore.board.data.items.find(
      item => item.id === listId && item.kind === 'todo'
    ) as TodoList | undefined
    
    if (!list) return

    const task = list.content.tasks.find(task => task.task_id === taskId)
    if (task) {
      task.completed = !task.completed
      boardStore.debouncedSaveBoard()
    }
  }
  
  // Delete a task
  const deleteTask = (listId: string, taskId: string) => {
    if (!boardStore.board) return

    const list = boardStore.board.data.items.find(
      item => item.id === listId && item.kind === 'todo'
    ) as TodoList | undefined
    
    if (!list) return

    list.content.tasks = list.content.tasks.filter(task => task.task_id !== taskId)
    boardStore.debouncedSaveBoard()
  }
  
  // Reorder tasks after drag and drop
  const reorderTasks = (listId: string, newTasksOrder: Task[]) => {
    if (!boardStore.board) return

    const list = boardStore.board.data.items.find(
      item => item.id === listId && item.kind === 'todo'
    ) as TodoList | undefined
    
    if (!list) return

    // Update the tasks array with the new order
    list.content.tasks = [...newTasksOrder]
    boardStore.debouncedSaveBoard()
  }
  
  // Move a task from one list to another
  const moveTaskBetweenLists = (sourceListId: string, taskId: string, targetListId: string, targetIndex: number) => {
    if (!boardStore.board) return
    
    // Find the source and target lists
    const sourceList = boardStore.board.data.items.find(
      item => item.id === sourceListId && item.kind === 'todo'
    ) as TodoList | undefined
    
    const targetList = boardStore.board.data.items.find(
      item => item.id === targetListId && item.kind === 'todo'
    ) as TodoList | undefined
    
    if (!sourceList || !targetList) return
    
    // Find the task to move
    const taskIndex = sourceList.content.tasks.findIndex(task => task.task_id === taskId)
    if (taskIndex === -1) return
    
    // Get a copy of the task
    const taskToMove = { ...sourceList.content.tasks[taskIndex] }
    
    // Remove the task from the source list
    sourceList.content.tasks = sourceList.content.tasks.filter(task => task.task_id !== taskId)
    
    // Add the task to the target list at the specified index
    targetList.content.tasks.splice(targetIndex, 0, taskToMove)
    
    // Save the board
    boardStore.debouncedSaveBoard()
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