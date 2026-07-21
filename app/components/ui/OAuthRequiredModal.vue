<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <Teleport to="body">
    <div class="oa-overlay" @click.self="authStore.dismissOAuthPrompt()">
      <div class="oa-card">
        <h2>Login required</h2>
        <p>Upload and voice recording are available for OAuth accounts only.</p>

        <div class="oa-actions">
          <a href="/api/_auth/google" class="oa-btn">Continue with Google</a>
          <a href="/api/_auth/github" class="oa-btn oa-btn--light">Continue with GitHub</a>
        </div>

        <button class="oa-cancel" @click="authStore.dismissOAuthPrompt()">Not now</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.oa-overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(249, 250, 251, 0.92);
  backdrop-filter: blur(4px);
}

.oa-card {
  width: 360px;
  max-width: calc(100vw - 24px);
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 24px;
  text-align: center;
}

.oa-card h2 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.oa-card p {
  margin: 8px 0 16px;
  font-size: 13px;
  color: #6B7280;
  line-height: 1.45;
}

.oa-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oa-btn {
  height: 38px;
  border-radius: 9px;
  border: 1px solid #2563EB;
  background: #2563EB;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oa-btn--light {
  background: #fff;
  color: #111827;
  border-color: #E5E7EB;
}

.oa-cancel {
  margin-top: 12px;
  border: none;
  background: transparent;
  font-size: 12px;
  color: #6B7280;
  cursor: pointer;
}
</style>
