import { ref } from 'vue'
import type { TodoTask } from '~/shared/types/board'

// Shared across all TodoList instances for cross-list DnD
const dragSource = ref<{ listId: string; task: TodoTask } | null>(null)

export function useTaskDragDrop(
  listId: string,
  getTasks: () => TodoTask[],
  setTasks: (tasks: TodoTask[]) => void,
) {
  const dropIndex = ref<number | null>(null)

  function onDragStart(e: DragEvent, task: TodoTask) {
    dragSource.value = { listId, task }
    e.dataTransfer!.effectAllowed = 'move'
    e.dataTransfer!.setData('text/plain', task.task_id)
    ;(e.target as HTMLElement).classList.add('task-dragging')
  }

  function onDragEnd(e: DragEvent) {
    ;(e.target as HTMLElement).classList.remove('task-dragging')
    dragSource.value = null
    dropIndex.value = null
  }

  function onDragOver(e: DragEvent, index: number) {
    if (!dragSource.value) return
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'move'
    dropIndex.value = index
  }

  function onDragOverList(e: DragEvent) {
    if (!dragSource.value) return
    e.preventDefault()
    // If dragging over empty area, drop at end
    if (dropIndex.value === null) dropIndex.value = getTasks().length
  }

  function onDragLeave(e: DragEvent) {
    // Only clear if leaving the list container entirely
    const related = e.relatedTarget as HTMLElement | null
    const list = (e.currentTarget as HTMLElement)
    if (!related || !list.contains(related)) {
      dropIndex.value = null
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    if (!dragSource.value) return
    const src = dragSource.value
    const targetIdx = dropIndex.value ?? getTasks().length

    if (src.listId === listId) {
      // Reorder within same list
      const arr = getTasks().filter(t => t.task_id !== src.task.task_id)
      const insertAt = Math.min(targetIdx, arr.length)
      arr.splice(insertAt, 0, src.task)
      setTasks(arr)
    } else {
      // Cross-list: insert into this list
      const arr = [...getTasks()]
      const insertAt = Math.min(targetIdx, arr.length)
      arr.splice(insertAt, 0, src.task)
      setTasks(arr)
      // Remove from source list is handled by the source's watcher via event
      window.dispatchEvent(new CustomEvent('task-moved', {
        detail: { sourceListId: src.listId, taskId: src.task.task_id },
      }))
    }

    dragSource.value = null
    dropIndex.value = null
  }

  // Listen for cross-list removal
  function onTaskMoved(e: Event) {
    const { sourceListId, taskId } = (e as CustomEvent).detail
    if (sourceListId === listId) {
      setTasks(getTasks().filter(t => t.task_id !== taskId))
    }
  }

  return {
    dragSource,
    dropIndex,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragOverList,
    onDragLeave,
    onDrop,
    onTaskMoved,
  }
}
