
<template>
    <div class="fixed px-4 py-2 top-4 left-4 rounded-lg shadow-lg bg-white divide-y">
      <div class="min-w-52 py-2 z-50 flex items-center gap-2">
        <img
          @pointerdown="toggleBoardList"
          @keypress.enter="toggleBoardList"
          :src="'/icons/Arrow-Bottom.svg'"
          class="h-5 w-5 sm:h-6 sm:w-6 transition-all duration-200 cursor-pointer"
          :class="{ 'rotate-180': isBoardListOpen }"
          alt="Board Icon"
          tabindex="0"
        />
        <h1
          v-if="!editTitle"
          class="text-base"
          @pointerdown="startEditingTitle"
          @keypress.enter="startEditingTitle"
          tabindex="1"
        >
          {{ boardStore.board?.data.title || 'New TackPad' }}
        </h1>
        <input 
          v-else 
          autofocus 
          :value="boardStore.board?.data.title || 'New TackPad'" 
          @blur="(e: FocusEvent) => saveTitle((e.target as HTMLInputElement).value)"
        />
      </div>
      <div class="items py-2 flex flex-col gap-2" v-if="isBoardListOpen">
        <div 
          class="text-sm cursor-pointer" 
          v-for="board in boardStore.boards" 
          @click="boardStore.initializeBoard(board.board_id)"
        >
          {{ board.title }}
        </div>
        <NuxtLink class="text-sm cursor-pointer flex gap-2 text-blue-500" to="/board/create">
          Create New TackPad +
        </NuxtLink>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { useBoard } from '~/composables/useBoard';
  
  const { 
    boardStore, 
    editTitle, 
    isBoardListOpen, 
    startEditingTitle, 
    saveTitle, 
    toggleBoardList 
  } = useBoard();
  </script>