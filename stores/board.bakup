import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { customAlphabet } from 'nanoid'
import { debounce } from 'lodash'

import type { Board, BoardItem, StickyNote, TodoList, Task, LinkItem, TimerItem, TextWidget } from '~/types/board'
import { useLocalStorage } from '@vueuse/core'
type Boards = {
  [key: string]: {
    board_id: string
    title: string
  }
}

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export const useBoardStore = defineStore('board', () => {
  // State
  const board = ref<Board | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedId = ref<string | null>(null)
  const scale = ref(1)
  const password = ref(null)
  const boards = useLocalStorage<Boards>('boards', {})
  console.log(boards)
  // Actions
  const initializeBoard = async (boardId: string = 'create') => {
    loading.value = true

    try {
      const response = await fetch(`/api/board/${boardId}`)
      if (!response.ok) throw new Error('Failed to load board')
      const raw = await response.json()
      if(raw.data.encrypted){
        console.log('encrypted')
        if(!password.value){
          console.log('no password')
          await usePasswordModal().showPasswordDialog()
        }
          try{
            board.value = { board_id: raw.board_id, data: await decrypt(raw.data, password.value!)}
          }catch(e){
            console.log(e)
            alert("Error decrypting")
            window.location.reload()
          }
      } else {
        board.value = raw
      }
      const route = useRoute()
      boards.value[board.value!.board_id] = {board_id: board.value!.board_id, title: board.value?.data.title || 'New TackPad'}
      if(route.params.id !== board.value?.board_id){
        await navigateTo(`/board/${board.value?.board_id}`)
      }
    } catch (err) {
      error.value = 'Failed to load board'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const setSelectedId = (id: string | null) => {
    selectedId.value = id
  }

  const setScale = (newScale: number) => {
    scale.value = newScale
  }

  const deleteSelected = () => {
    if (!board.value || !selectedId.value) return

    board.value.data.items = board.value.data.items.filter(
      item => item.id !== selectedId.value
    )
    selectedId.value = null
    debouncedSaveBoard()
  }

  const updateItem = (itemId: string, updates: Partial<BoardItem> | { text?: string, color?: string }) => {
    if (!board.value) return

    const item = board.value.data.items.find(item => item.id === itemId)
    if (item) {
      if ('text' in updates || 'color' in updates) {
        // Handle StickyNote content updates
        if (item.kind === 'note') {
          item.content = {
            ...item.content,
            text: updates.text ?? item.content.text,
            color: updates.color ?? item.content.color
          }
        }
      } else {
        // Handle other updates
        Object.assign(item, updates)
      }
      debouncedSaveBoard()
    }
  }

  const addNote = async (
    content: string,
    position: { x: number; y: number; color: string; width: number; height: number }
  ) => {
    if (!board.value) return

    const newNote: StickyNote = {
      id: `STICKY-${nanoid(10)}`,
      kind: 'note',
      content: {
        text: content,
        color: position.color
      },
      x_position: position.x,
      y_position: position.y,
      width: position.width,
      height: position.height,
    }

    board.value.data.items.push(newNote)
    debouncedSaveBoard()
    return newNote
  }

  const addTodoList = async (
    position: { x: number; y: number; width: number; height: number }
  ) => {
    if (!board.value) return

    const newTodo: TodoList = {
      id: `TODO-${nanoid(10)}`,
      kind: 'todo',
      content: {
        title: 'Todo List',
        tasks: []
      },
      x_position: position.x,
      y_position: position.y,
      width: position.width,
      height: position.height,
    }

    board.value.data.items.push(newTodo)
    debouncedSaveBoard()
    return newTodo
  }

  const addLinkItem = async (
    link: string, 
    position: { x: number; y: number; width: number; height: number }
  ): Promise<LinkItem | null> => {
    if (!board.value) return null;
    console.log("addLinkItem")

    // Create initial link item immediately
    const hostname = new URL(link).hostname;
    const initialLinkItem: LinkItem = {
      id: `LINK-${nanoid(10)}`,
      kind: 'link',
      content: {
        url: link,
        title: `Link to ${hostname}`,
        image: '',
        description: `Loading metadata...`
      },
      x_position: position.x,
      y_position: position.y,
      width: position.width,
      height: position.height
    };

    // Add to board immediately
    board.value.data.items.push(initialLinkItem);
    debouncedSaveBoard();
  
    try {
      const response = await fetch(
        `/api/metadata?url=${encodeURIComponent(link)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch link data: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Determine if we received oEmbed or regular metadata
      const isOEmbed = data.source === 'oembed';
      const metadata = data.data;
      
      // Update the existing link item with metadata
      const updatedContent = isOEmbed 
        ? {
            url: link,
            thumbnail_url: metadata.thumbnail_url || '',
            thumbnail_width: metadata.width || metadata.thumbnail_width || position.width,
            thumbnail_height: metadata.height || metadata.thumbnail_height || position.height,
            html: metadata.html || '',
            type: metadata.type || 'rich'
          }
        : {
            url: link,
            title: metadata.title || `Link to ${hostname}`,
            image: metadata.image || metadata.thumbnail_url || '',
            description: metadata.description || `A link to ${hostname}`
          };

      const updatedDimensions = isOEmbed 
        ? {
            width: metadata.width || metadata.thumbnail_width || position.width,
            height: metadata.height || metadata.thumbnail_height || position.height
          }
        : {
            width: position.width,
            height: position.height
          };
  
      console.log("Updating with metadata:", { content: updatedContent, ...updatedDimensions });
      console.log(data);

      // Find and update the link item
      const itemIndex = board.value.data.items.findIndex(item => item.id === initialLinkItem.id);
      if (itemIndex !== -1) {
        const updatedItem: LinkItem = {
          ...initialLinkItem,
          content: updatedContent,
          width: updatedDimensions.width,
          height: updatedDimensions.height
        };
        board.value.data.items[itemIndex] = updatedItem;
        debouncedSaveBoard();
        return updatedItem;
      }
      return initialLinkItem;
  
    } catch (error) {
      console.error('Error adding link item:', error);
      console.log("fallback");

      // Update the initial link item with final fallback content
      const itemIndex = board.value.data.items.findIndex(item => item.id === initialLinkItem.id);
      if (itemIndex !== -1) {
        const fallbackItem: LinkItem = {
          ...initialLinkItem,
          content: {
            ...initialLinkItem.content,
            description: `A link to ${hostname}`
          }
        };
        board.value.data.items[itemIndex] = fallbackItem;
        debouncedSaveBoard();
        return fallbackItem;
      }
      return initialLinkItem;
    }
  }

  const addTimer = (
    position: { x: number; y: number; width?: number; height?: number }
  ) => {
    if (!board.value) return

    const newTimer: TimerItem = {
      id: `TIMER-${nanoid(10)}`,
      kind: 'timer',
      x_position: position.x,
      y_position: position.y,
      width: position.width ?? 300,
      height: position.height ?? 300,
      content: {
        timerType: 'Focus',
        duration: 25
      }
    }

    board.value.data.items.push(newTimer)
    selectedId.value = newTimer.id
    debouncedSaveBoard()
    return newTimer
  }

  const addTask = async (listId: string, content: string | {text: string, completed?: boolean}) => {
    if (!board.value) return
    const list = board.value.data.items.find(item => 
      item.id === listId && item.kind === 'todo'
    ) as TodoList | undefined
    
    if (!list) return

    let newTask: Task = null!
    if(typeof content === 'string'){
    newTask = {
      task_id: `TASK-${nanoid(10)}`,
      content,
      completed: false,
    }
    } else if(content.text) {
      newTask = {
        task_id: `TASK-${nanoid(10)}`,
        content: content.text,
        completed: Boolean(content.completed),
      }
    }

    list.content.tasks.push(newTask)
    await debouncedSaveBoard()
    return newTask
  }

  const updateTask = async (listId: string, taskId: string, content: string) => {
    if (!board.value) return

    const list = board.value.data.items.find(item => 
      item.id === listId && item.kind === 'todo'
    ) as TodoList | undefined
    
    if (!list) return

    const task = list.content.tasks.find(task => task.task_id === taskId)
    if (task) {
      task.content = content
      await debouncedSaveBoard()
    }
  }
  const deleteTask = async (listId: string, taskId: string) => {
    if (!board.value) return

    const list = board.value.data.items.find(item => 
      item.id === listId && item.kind === 'todo'
    ) as TodoList | undefined
    
    if (!list) return

    list.content.tasks = list.content.tasks.filter(task => task.task_id !== taskId)
    await debouncedSaveBoard()
  }

  const addTextWidget = (
    position: { x: number; y: number; width?: number; height?: number }
  ) => {
    if (!board.value) return null

    const textWidget: TextWidget = {
      id: nanoid(),
      kind: 'text',
      x_position: position.x,
      y_position: position.y,
      width: position.width || 200,
      height: position.height || 64,
      content: {
        text: 'Double click to edit text'
      }
    }

    board.value.data.items.push(textWidget)
    debouncedSaveBoard()
    return textWidget
  }

  const setBoardTitle = (title: string) => {
    if (!board.value) return
    board.value.data.title = title
    boards.value[board.value.board_id].title = title
    debouncedSaveBoard()
  }

  const saveBoard = async () => {
    if (!board.value) return

    let {data, board_id } = unref(board.value)
    let encrypted: EncryptedData = null!;
    if(password.value)
    encrypted = await encrypt(data, password.value)
  console.log({encrypted})
    try {
      const response = await fetch(`/api/save/${board_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({board_id,data:encrypted || data }),
      })

      if (!response.ok) throw new Error('Failed to save board')
    } catch (err) {
      error.value = 'Failed to save board'
      console.error(err)
    }
  }

  // Create debounced version of saveBoard
  const debouncedSaveBoard = debounce(saveBoard, 1000)
  useHead({
    title: computed(() => `${(board.value?.data.title || 'TackPad')} | TackPad`),
  })

  return {
    // State
    board,
    loading,
    error,
    selectedId,
    scale,
    password,

    // Actions
    initializeBoard,
    setSelectedId,
    setScale,
    deleteSelected,
    updateItem,
    addNote,
    addTodoList,
    addLinkItem,
    addTimer,
    addTextWidget,
    addTask,
    updateTask,
    deleteTask,
    setBoardTitle,
    saveBoard,
    boards:readonly(boards),
  }
})