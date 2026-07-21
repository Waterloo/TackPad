<script setup lang="ts">
import { useSecurityStore } from '~/stores/security'

const securityStore = useSecurityStore()
const recoveryCode = ref('')

watch(() => securityStore.restorePromptOpen, (open) => {
  if (open) recoveryCode.value = ''
})

async function restore() {
  await securityStore.restoreWithRecoveryCode(recoveryCode.value)
}
</script>

<template>
  <Teleport to="body">
    <div class="rr-overlay" @click.self="securityStore.dismissRestorePrompt()">
      <div class="rr-card">
        <h2>Restore your encryption key</h2>
        <p>Enter the recovery code you saved when you first enabled encrypted items.</p>

        <input
          v-model="recoveryCode"
          class="rr-input"
          placeholder="ABCD-EF12-3456-7890"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter="restore"
        />

        <p v-if="securityStore.restoreError" class="rr-error">{{ securityStore.restoreError }}</p>

        <div class="rr-actions">
          <button class="rr-btn rr-btn--light" @click="securityStore.dismissRestorePrompt()">Not now</button>
          <button class="rr-btn" :disabled="securityStore.restoreBusy || !recoveryCode.trim()" @click="restore">
            {{ securityStore.restoreBusy ? 'Restoring...' : 'Restore access' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.rr-overlay {
  position: fixed;
  inset: 0;
  z-index: 10002;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(249, 250, 251, 0.92);
  backdrop-filter: blur(4px);
}

.rr-card {
  width: 380px;
  max-width: calc(100vw - 24px);
  padding: 24px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
}

.rr-card h2 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #111827;
}

.rr-card p {
  margin: 0 0 14px;
  font-size: 13px;
  color: #6B7280;
  line-height: 1.5;
}

.rr-input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #D1D5DB;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 14px;
  text-transform: uppercase;
}

.rr-error {
  margin-top: 10px;
  color: #DC2626;
}

.rr-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.rr-btn {
  height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  background: #2563EB;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.rr-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.rr-btn--light {
  background: #F3F4F6;
  color: #111827;
}
</style>
