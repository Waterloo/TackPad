<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { useAuthStore } from '~/stores/auth'

const props = withDefaults(defineProps<{ dismissible?: boolean }>(), { dismissible: true })
const emit = defineEmits<{ dismiss: [] }>()

const authStore = useAuthStore()

function dismiss() {
  if (!props.dismissible) return
  authStore.dismissUsernamePrompt()
  emit('dismiss')
}

const username = ref('')
const status = ref<'idle' | 'too_short' | 'invalid' | 'checking' | 'taken' | 'available'>('idle')
const submitting = ref(false)

const PATTERN = /^[a-z0-9_]{3,20}$/

const checkAvailability = useDebounceFn(async (value: string) => {
  if (!PATTERN.test(value)) return
  status.value = 'checking'
  try {
    const { available } = await $fetch<{ available: boolean }>('/api/profile/check-username', {
      params: { username: value },
    })
    // Only update if input hasn't changed while checking
    if (username.value === value) {
      status.value = available ? 'available' : 'taken'
    }
  }
  catch {
    if (username.value === value) status.value = 'idle'
  }
}, 300)

function onInput() {
  const val = username.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
  username.value = val

  if (val.length === 0) { status.value = 'idle'; return }
  if (val.length < 3) { status.value = 'too_short'; return }
  if (!PATTERN.test(val)) { status.value = 'invalid'; return }

  checkAvailability(val)
}

async function submit() {
  if (status.value !== 'available' || submitting.value) return
  submitting.value = true
  try {
    await authStore.updateProfile({ username: username.value })
  }
  catch {
    status.value = 'taken'
  }
  finally {
    submitting.value = false
  }
}

const statusMessage = computed(() => {
  switch (status.value) {
    case 'too_short': return 'At least 3 characters'
    case 'invalid': return 'Only lowercase letters, numbers, and underscores'
    case 'checking': return 'Checking...'
    case 'taken': return 'Already taken'
    case 'available': return 'Available!'
    default: return ''
  }
})

const statusColor = computed(() => {
  switch (status.value) {
    case 'taken': case 'invalid': return '#EF4444'
    case 'available': return '#22C55E'
    case 'checking': return '#9CA3AF'
    default: return '#9CA3AF'
  }
})

const canSubmit = computed(() => status.value === 'available' && !submitting.value)
</script>

<template>
  <Teleport to="body">
    <div class="um-overlay" @click.self="dismiss">
      <div class="um-card">
        <!-- Close button -->
        <button v-if="dismissible" class="um-close" aria-label="Skip" @click="dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <!-- Icon -->
        <div class="um-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <h2 class="um-heading">Pick a username</h2>
        <p class="um-sub">Choose a unique handle so others can mention you on boards.</p>

        <!-- Input -->
        <div class="um-field">
          <span class="um-at">@</span>
          <input
            v-model="username"
            class="um-input"
            placeholder="your_username"
            maxlength="20"
            spellcheck="false"
            autocomplete="off"
            @input="onInput"
            @keydown.enter="submit"
          />
          <!-- Status icon -->
          <span v-if="status === 'available'" class="um-check">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="8" fill="#22C55E" />
              <path d="M5 8l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span v-if="status === 'checking'" class="um-spinner" />
        </div>

        <!-- Status message -->
        <Transition name="um-msg">
          <p v-if="statusMessage" class="um-status" :style="{ color: statusColor }">
            {{ statusMessage }}
          </p>
        </Transition>

        <!-- Submit -->
        <button
          class="um-btn"
          :class="{ 'um-btn--disabled': !canSubmit }"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ submitting ? 'Setting up...' : 'Continue' }}
        </button>

        <p class="um-note">This can't be changed later.</p>

        <!-- Divider -->
        <div class="um-divider">
          <span class="um-divider-line" />
          <span class="um-divider-text">or continue with</span>
          <span class="um-divider-line" />
        </div>

        <!-- OAuth buttons -->
        <div class="um-oauth">
          <a href="/api/_auth/google" class="um-oauth-btn">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </a>
          <a href="/api/_auth/github" class="um-oauth-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#24292f">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            GitHub
          </a>
        </div>

        <button v-if="dismissible" class="um-skip" @click="dismiss">Skip for now</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.um-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(249, 250, 251, 0.92);
  backdrop-filter: blur(4px);
}

.um-card {
  width: 360px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 32px 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
}

.um-close {
  position: absolute;
  top: 12px; right: 12px;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent;
  border-radius: 7px; color: #9CA3AF; cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.um-close:hover { background: #F3F4F6; color: #374151; }

.um-skip {
  margin-top: 12px;
  border: none; background: transparent;
  font-family: system-ui, sans-serif;
  font-size: 12px; font-weight: 500;
  color: #9CA3AF; cursor: pointer;
  transition: color 0.1s;
}
.um-skip:hover { color: #6B7280; }

.um-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #EFF6FF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.um-heading {
  font-family: system-ui, sans-serif;
  font-size: 18px;
  font-weight: 650;
  color: #111827;
  margin: 0 0 6px;
}

.um-sub {
  font-family: system-ui, sans-serif;
  font-size: 13px;
  color: #6B7280;
  margin: 0 0 20px;
  line-height: 1.45;
}

.um-field {
  width: 100%;
  display: flex;
  align-items: center;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 0 12px;
  height: 42px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.um-field:focus-within {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  background: #fff;
}

.um-at {
  font-family: system-ui, sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: #9CA3AF;
  margin-right: 2px;
  user-select: none;
}

.um-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: system-ui, sans-serif;
  font-size: 15px;
  color: #111827;
  padding: 0;
  min-width: 0;
}

.um-input::placeholder { color: #D1D5DB; }

.um-check {
  display: flex;
  align-items: center;
  margin-left: 6px;
}

.um-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #E5E7EB;
  border-top-color: #9CA3AF;
  border-radius: 50%;
  animation: um-spin 0.6s linear infinite;
  margin-left: 6px;
  flex-shrink: 0;
}

@keyframes um-spin { to { transform: rotate(360deg); } }

.um-status {
  font-family: system-ui, sans-serif;
  font-size: 12px;
  margin: 8px 0 0;
  min-height: 16px;
}

.um-msg-enter-active { transition: opacity 0.15s ease; }
.um-msg-leave-active { transition: opacity 0.1s ease; }
.um-msg-enter-from, .um-msg-leave-to { opacity: 0; }

.um-btn {
  width: 100%;
  height: 40px;
  margin-top: 18px;
  border: none;
  border-radius: 10px;
  background: #2563EB;
  color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.um-btn:hover:not(:disabled) { background: #1D4ED8; }
.um-btn:active:not(:disabled) { transform: scale(0.98); }
.um-btn--disabled { opacity: 0.45; cursor: not-allowed; }

.um-note {
  font-family: system-ui, sans-serif;
  font-size: 11px;
  color: #9CA3AF;
  margin: 10px 0 0;
}

.um-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-top: 20px;
}

.um-divider-line {
  flex: 1;
  height: 1px;
  background: #E5E7EB;
}

.um-divider-text {
  font-family: system-ui, sans-serif;
  font-size: 11px;
  color: #9CA3AF;
  white-space: nowrap;
}

.um-oauth {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
}

.um-oauth-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  background: #fff;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s;
}

.um-oauth-btn:hover {
  background: #F9FAFB;
  border-color: #D1D5DB;
}
</style>
