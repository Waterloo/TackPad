<script setup lang="ts">
import Modal from '../UI/Modal.vue'
import {useBoardStore} from '~/stores/board'
const boardStore = useBoardStore()
let password = ref(null)
const route = useRoute()
let errMsg = ref("")
async function submitPassword(){
  if(password.value){
    errMsg.value=""
    boardStore.password=password.value
     // if encrypted = true then unlocking
    if(boardStore.isEncrypted == true){
      boardStore.initializeBoard(route.params.id)
    }else{
      boardStore.saveBoard()
    }
    password.value = null
    boardStore.showPasswordDialog = false

  }else{
    errMsg.value="Password Cannot be empty"
  }
}
function cancelPassword(){
    boardStore.showPasswordDialog = false
}
</script>

<template>
      <Modal 
  v-model:model-value="boardStore.showPasswordDialog" 
  title="Enter Password" 
  :show-close-button="false" 
  :close-on-backdrop-click="false" 
  :close-on-esc="false"
>
  <div class="">
    <p class="text-gray-600 mb-4">Please enter your password to continue</p>
    <input 
      v-model="password" 
      type="password"
      placeholder="Enter password" 
      class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      autofocus
    />
    <div class="text-sm text-red-400">
      {{ errMsg }}
    </div>
  </div>
  
  <template #footer>
    <div class=" bg-gray-50 rounded-b-lg flex justify-end space-x-3">
      <button 
        @click="cancelPassword" 
        class="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
      >
        Cancel
      </button>
      <button 
        @click="submitPassword" 
        class="px-4 py-2 bg-[#4F46E5] text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
      >
        Confirm
      </button>
    </div>
  </template>
</Modal>
</template>
