<script setup lang="ts">
import { useSecurityStore } from '~/stores/security'

const securityStore = useSecurityStore()
</script>

<template>
  <Teleport to="body">
    <div class="rc-overlay">
      <div class="rc-card">
        <div class="rc-badge">Recovery code</div>
        <h2>Save this code before you continue</h2>
        <p>
          This code is the only way to restore your encrypted TackPad secrets on a new device if your current browser is lost.
        </p>

        <div class="rc-code">{{ securityStore.generatedRecoveryCode }}</div>

        <button class="rc-primary" @click="securityStore.confirmRecoveryCodeSaved()">
          I saved this code
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.rc-overlay {
  position: fixed;
  inset: 0;
  z-index: 10002;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(249, 250, 251, 0.94);
  backdrop-filter: blur(4px);
}

.rc-card {
  width: 420px;
  max-width: calc(100vw - 24px);
  padding: 28px;
  border-radius: 18px;
  background: linear-gradient(180deg, #FFFDF7 0%, #FFFFFF 100%);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: center;
}

.rc-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  background: #FEF3C7;
  color: #92400E;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.rc-card h2 {
  margin: 14px 0 8px;
  font-size: 20px;
  color: #111827;
}

.rc-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #6B7280;
}

.rc-code {
  margin: 18px 0;
  padding: 16px 18px;
  border-radius: 12px;
  background: #111827;
  color: #F9FAFB;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 18px;
  letter-spacing: 0.08em;
}

.rc-primary {
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 10px;
  background: #2563EB;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
</style>
