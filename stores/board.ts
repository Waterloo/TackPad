// stores/boardStore.ts
import { ref, computed, unref } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { debounce } from 'lodash'
import { useRoute } from 'vue-router'

// import type { EncryptedData } from '~/types/encryption'
import type { Board, BoardItem, Boards } from '~/types/board'
import { usePasswordDialog } from '~/composables/usePasswordDialog'
import { decrypt, encrypt } from '~/utils/crypto'

export const useBoardStore = defineStore('board', () => {
  // State
  const board = ref<Board | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedId = ref<string | null>(null)
  const scale = ref(1)
  const password = ref(null)
  const boards = useLocalStorage<Boards>('boards', {})

  // Actions
  const initializeBoard = async (boardId: string = 'load') => {

    const route = useRoute()
    loading.value = true

    try {
      // If 'load' is passed, try to load the last board from localStorage
      if (boardId === 'laod') {
        const existingBoardIds = Object.keys(boards.value)
        
        if (existingBoardIds.length > 0) {
          // Get the last board ID from localStorage
          const lastBoardId = existingBoardIds[existingBoardIds.length - 1]
          // Navigate to the last board
          await navigateTo(`/board/${lastBoardId}`)
          return
        }
        // If no boards in localStorage, proceed with creating a new board
        boardId = 'create'
      }

      // Attempt to load the specified board (or create a new one)
      const response = await fetch(`/api/board/${boardId}`)
      if (!response.ok) throw new Error('Failed to load board')
      const raw = await response.json()

      if(raw.data.encrypted){
        if(!password.value){
          await usePasswordDialog().showPasswordDialog()
        }
        try{
          board.value = { board_id: raw.board_id, data: await decrypt(raw.data, password.value!)}
        } catch(e) {
          console.error(e)
          alert("Error decrypting")
          window.location.reload()
        }
      } else {
        board.value = raw
      }

      boards.value[board.value!.board_id] = {
        board_id: board.value!.board_id, 
        title: board.value?.data.title || 'New TackPad'
      }
  
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

  const setBoardTitle = (title: string) => {
    if (!board.value) return
    board.value.data.title = title
    boards.value[board.value.board_id].title = title
    debouncedSaveBoard()
  }

  const saveBoard = async () => {
    if (!board.value) return

    let {data, board_id} = unref(board.value)
    let encrypted: any | null = null;
    
    if(password.value) {
      encrypted = await encrypt(data, password.value)
    }
    
    try {
      const response = await fetch(`/api/save/${board_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({board_id, data: encrypted || data}),
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
  // initializeBoard()
  // if (useRoute().path === '/') {
  //   initializeBoard()
  // }
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
    setBoardTitle,
    saveBoard,
    debouncedSaveBoard,
    boards: computed(() => boards.value),
  }
})