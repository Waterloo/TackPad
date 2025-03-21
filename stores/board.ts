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
  const isOldBoard = ref(false)
  const isOwner = ref(false)
  const password = ref(null)
  const boards = useLocalStorage<Boards>('boards', {})
  const settings = useLocalStorage<BoardSettings>('settings', {})
  const boardSettings = computed(() => settings.value[board.value?.board_id || ''])

  // Get route at the store level
  const route = useRoute()

  // Actions
  const initializeBoard = async (boardId: string = 'load') => {
    loading.value = true
    
    // Case: 'load' - Load the latest board from local storage
    if(boardId === 'load'){
      const existingBoardIds = Object.keys(boards.value)
      if (existingBoardIds.length > 0) {
        const lastBoardId = boards.value[existingBoardIds[existingBoardIds.length - 1]].board_id
        await navigateTo(`/board/${lastBoardId}`)
        return 
      } else {
        // No boards in local storage, redirect to create
        await navigateTo('/board/create')
        return
      }
    }

    try {
      // Case: 'create' or specific board ID - fetch from API
      const response = await fetch(`/api/board/${boardId}`)
      if (!response.ok) throw new Error('Failed to load board')
      const raw = await response.json()
      const boardData = raw.data
      const settingsData = raw.settings
      isOldBoard.value = raw.OldBoard
      isOwner.value = raw.isOwner
      if(boardData.data.encrypted){
        if(!password.value){
          await usePasswordDialog().showPasswordDialog()
        }
        try{
          board.value = { board_id: boardData.board_id, data: await decrypt(boardData.data, password.value!)}
        } catch(e) {
          console.error(e)
          alert("Error decrypting")
          window.location.reload()
        }
      } else {
        board.value = boardData
      }

      // Save to local storage
      boards.value[board.value!.board_id] = {
        board_id: board.value!.board_id, 
        title: board.value?.data.title || 'New TackPad'
      }
      settings.value[board.value!.board_id] = settingsData
  
      // Redirect if needed (for 'create' or when board ID doesn't match route)
      if(boardId === 'create' || (route?.params?.id && route.params.id !== board.value?.board_id)){
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
    if (boardSettings.value?.read_only && !isOldBoard.value && !isOwner.value){
      navigateTo(`/board/${board.value?.board_id}?error=true&title=Board+is+read+only&message=Board+is+read+only+no+actions+you+perform+will+be+saved&actionLink={"url":"/board/${board.value?.board_id}","text":"Go+Back"}`)
      initializeBoard(board.value?.board_id)
      return
    }

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
      
      // Get response data including updated settings
      const responseData = await response.json()
      
      // Update local settings if settings were returned
      if (responseData.settings) {
        settings.value[board_id] = responseData.settings
      }
    } catch (err) {
      error.value = 'Failed to save board'
      console.error(err)
    }
  }
  const updateSettings = async (update: any) => {
    if (!board.value) return
    if(!boardSettings.value) return

    try {
      const response = await fetch(`/api/settings/${boardSettings.value.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      })
      
      if (!response.ok) throw new Error('Failed to update settings')
      
      // Get the updated settings from the response
      const updatedSettings = await response.json()
      
      // Update local settings
      settings.value[board.value.board_id] = updatedSettings
      
    } catch(err) {
      error.value = 'Failed to update settings'
      console.error(err)
    }
  }

  const deleteBoard = async () => {
    if (!board.value) return
    
    try {
      const response = await fetch(`/api/board/${board.value.board_id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete board')
      
      // Remove board from local storage
      delete boards.value[board.value.board_id]
      board.value = null
      selectedId.value = null
      // redirect to old board
      const lastBoardId = Object.keys(boards.value).pop()
      if(lastBoardId) {
        await navigateTo(`/board/${lastBoardId}`)
      }else{
        await navigateTo('/home')
      }
    } catch (err) {
      error.value = 'Failed to delete board'
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
    isOldBoard,
    isOwner,
    boardSettings,
    // Actions
    initializeBoard,
    setSelectedId,
    setScale,
    deleteSelected,
    setBoardTitle,
    saveBoard,
    deleteBoard,
    debouncedSaveBoard,
    updateSettings,
    boards: computed(() => boards.value),
  }
})