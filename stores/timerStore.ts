// stores/timerStore.ts
import { defineStore } from 'pinia'
import { customAlphabet } from 'nanoid'
import { useBoardStore } from './board'
import type { TimerItem, Position } from '~/types/board'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export const useTimerStore = defineStore('timers', () => {
  // Get reference to the board store
  const boardStore = useBoardStore()
  
  // Add a timer
  const addTimer = (position: Position) => {
    if (!boardStore.board) return null

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

    boardStore.board.data.items.push(newTimer)
    boardStore.debouncedSaveBoard()
    return newTimer
  }
  
  // Update timer settings
  const updateTimerSettings = (
    timerId: string, 
    settings: { timerType?: 'Focus' | 'Short Break' | 'Long Break'; duration?: number }
  ) => {
    if (!boardStore.board) return

    const timer = boardStore.board.data.items.find(
      item => item.id === timerId && item.kind === 'timer'
    ) as TimerItem | undefined
    
    if (timer) {
      if (settings.timerType !== undefined) timer.content.timerType = settings.timerType
      if (settings.duration !== undefined) timer.content.duration = settings.duration
      
      boardStore.debouncedSaveBoard()
    }
  }
  
  return {
    addTimer,
    updateTimerSettings
  }
})