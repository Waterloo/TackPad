
<template>
    <dialog class="p-4 w-80 md:w-96" ref="passwordRef">
      <button
        @click="closePasswordDialog"
        class="absolute top-2 right-2 text-2xl text-gray-500 hover:text-gray-700"
      >
        &times;
      </button>
      <h2 class="text-xl font-semibold mb-4">Enter Password</h2>
      <p class="text-sm text-gray-600 mb-4">
        This board is password protected. Please enter the password to view it.
      </p>
      <form @submit.prevent="submitPassword">
        <input
          v-model="passwordInput"
          type="password"
          class="w-full p-2 border rounded mb-4"
          placeholder="Password"
          required
        />
        <div class="flex justify-end">
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Submit
          </button>
        </div>
      </form>
    </dialog>
  </template>
  
  <script setup lang="ts">
  import { usePasswordDialog } from '~/composables/usePasswordDialog';
  
  const { passwordRef, passwordInput, closePasswordDialog, submitPassword } = usePasswordDialog();
  </script>