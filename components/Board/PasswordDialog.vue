
<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import Button from 'primevue/button'
import { useBoardStore } from '~/stores/board'

const boardStore = useBoardStore()
let password = ref(null)
const route = useRoute()
let errMsg = ref("")

async function submitPassword() {
  if (password.value) {
    errMsg.value = ""
    boardStore.password = password.value
    // if encrypted = true then unlocking
    if (boardStore.isEncrypted == true) {
      boardStore.initializeBoard(route.params.id)
    } else {
      boardStore.saveBoard()
    }
    password.value = null
    boardStore.showPasswordDialog = false
  } else {
    errMsg.value = "Password Cannot be empty"
  }
}

function cancelPassword() {
  boardStore.showPasswordDialog = false
}
</script>

<template>
  <Dialog
    v-model:visible="boardStore.showPasswordDialog"
    header="Enter Password"
    :modal="true"
    :closable="false"
    :close-on-escape="false"
    :style="{ width: '25rem' }"
    :breakpoints="{ '575px': '90vw' }"
  >
    <div class="space-y-4">
      <p class="text-gray-600 mb-4">Please enter your password to continue</p>

      <Password
        v-model="password"
        placeholder="Enter password"
        :feedback="false"
        toggleMask
        fluid
        :invalid="!!errMsg"
        autofocus
        @keyup.enter="submitPassword"
      />

      <div v-if="errMsg" class="text-sm text-red-400">
        {{ errMsg }}
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <Button
          label="Cancel"
          severity="secondary"
          variant="outlined"
          @click="cancelPassword"
        />
        <Button
          label="Confirm"
          @click="submitPassword"
        />
      </div>
    </template>
  </Dialog>
</template>
