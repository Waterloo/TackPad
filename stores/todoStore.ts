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
  
  return {
    addTodoList,
    updateTodoTitle,
    addTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask
  }
})