<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useSecurityStore } from '~/stores/security'

const authStore = useAuthStore()
const securityStore = useSecurityStore()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <UiUsernameModal v-if="authStore.usernamePromptOpen" @dismiss="authStore.dismissUsernamePrompt()" />
  <UiOAuthRequiredModal v-if="authStore.oauthPromptOpen" />
  <UiRecoveryCodeModal v-if="securityStore.recoveryCodePromptOpen" />
  <UiRecoveryRestoreModal v-if="securityStore.restorePromptOpen" />
</template>
