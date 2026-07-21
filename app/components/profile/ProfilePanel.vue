<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import UsageIndicator from '~/components/profile/UsageIndicator.vue'
import { useAuthStore } from '~/stores/auth'
import { useBoardStore } from '~/stores/board'

const visible = defineModel<boolean>('visible', { default: false })

const authStore = useAuthStore()
const { profile, isAnonymous } = storeToRefs(authStore)

const boardStore = useBoardStore()
const { boardId, title: boardTitle, accessLevel, ownerId } = storeToRefs(boardStore)

const tab = ref<'account' | 'board' | 'billing'>('account')
const isOwner = computed(() => ownerId.value === profile.value?.id)

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
    if (username.value === value) status.value = available ? 'available' : 'taken'
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

async function submitUsername() {
  if (status.value !== 'available' || submitting.value) return
  submitting.value = true
  try {
    await authStore.updateProfile({ username: username.value })
    username.value = ''
    status.value = 'idle'
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

const canSubmit = computed(() => status.value === 'available' && !submitting.value)

const displayName = computed(() => {
  const p = profile.value
  if (!p) return 'Anonymous'
  return p.firstName || p.username || 'Anonymous'
})

const avatarInitials = computed(() => displayName.value
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(w => w[0]?.toUpperCase() ?? '')
  .join(''))

const profileEmail = computed(() => profile.value?.email ?? null)

const showDeleteConfirm = ref(false)
const deleting = ref(false)
const router = useRouter()

const accessLevelLabel = computed(() => {
  switch (accessLevel.value) {
    case 'public': return 'Public'
    case 'view_only': return 'View only'
    case 'private': return 'Private'
    default: return accessLevel.value
  }
})

async function deleteBoard() {
  if (deleting.value || !boardId.value) return
  deleting.value = true
  try {
    await $fetch(`/api/board/${boardId.value}`, { method: 'DELETE' })
    boardStore.forgetBoard(boardId.value)
    showDeleteConfirm.value = false
    visible.value = false
    router.push('/')
  }
  catch (err: any) {
    console.error('[ProfilePanel] Delete failed:', err)
  }
  finally {
    deleting.value = false
  }
}

const usage = computed(() => profile.value?.usage ?? {
  consumption: 0,
  limit: 25 * 1024 * 1024,
  remaining: 25 * 1024 * 1024,
  plan: 'free' as const,
})
</script>

<template>
  <Drawer v-model:visible="visible" position="right" :style="{ width: '360px' }" :modal="true" :dismissable="true">
    <template #header>
      <span class="pp-header">Profile</span>
    </template>

    <div class="pp-body">
      <div class="pp-identity">
        <div class="pp-avatar">{{ avatarInitials }}</div>
        <div class="pp-info">
          <span class="pp-name">{{ displayName }}</span>
          <span v-if="profile?.username" class="pp-handle">@{{ profile.username }}</span>
          <span v-if="profileEmail" class="pp-email">{{ profileEmail }}</span>
        </div>
      </div>

      <div class="pp-tabs" role="tablist">
        <button class="pp-tab" :class="{ 'pp-tab--on': tab === 'account' }" @click="tab = 'account'">Account</button>
        <button class="pp-tab" :class="{ 'pp-tab--on': tab === 'board' }" @click="tab = 'board'">Board</button>
        <button
          class="pp-tab"
          :class="{ 'pp-tab--on': tab === 'billing', 'pp-tab--disabled': isAnonymous }"
          :disabled="isAnonymous"
          :title="isAnonymous ? 'Login to view billing' : 'Billing'"
          @click="tab = 'billing'"
        >
          Billing
        </button>
      </div>

      <section v-if="tab === 'account'" class="pp-section">
        <div v-if="profile && !profile.username" class="pp-card">
          <div class="pp-section-label">Create username</div>
          <p class="pp-section-hint">Choose a unique handle so others can mention you.</p>

          <div class="pp-username-field">
            <span class="pp-at">@</span>
            <input
              v-model="username"
              class="pp-username-input"
              placeholder="your_username"
              maxlength="20"
              spellcheck="false"
              autocomplete="off"
              @input="onInput"
              @keydown.enter="submitUsername"
            >
          </div>
          <p v-if="statusMessage" class="pp-status">{{ statusMessage }}</p>

          <button class="pp-btn pp-btn--primary" :disabled="!canSubmit" @click="submitUsername">
            {{ submitting ? 'Setting up...' : 'Create username' }}
          </button>
        </div>

        <div v-if="isAnonymous" class="pp-card">
          <div class="pp-section-label">Connect account</div>
          <p class="pp-section-hint">OAuth is required for uploads and voice recordings.</p>
          <div class="pp-oauth-buttons">
            <a href="/api/_auth/google" class="pp-oauth-btn">Google</a>
            <a href="/api/_auth/github" class="pp-oauth-btn">GitHub</a>
          </div>
        </div>
      </section>

      <section v-if="tab === 'board'" class="pp-section">
        <div v-if="boardId" class="pp-card">
          <div class="pp-section-label">Current board</div>
          <div class="pp-board-title">{{ boardTitle }}</div>
          <div class="pp-board-meta">{{ boardId }} · {{ accessLevelLabel }}</div>
          <div class="pp-board-role">Your role: <strong>{{ isOwner ? 'Owner' : 'Editor' }}</strong></div>

          <button v-if="isOwner" class="pp-btn pp-btn--danger" @click="showDeleteConfirm = true">
            Delete board
          </button>
        </div>
      </section>

      <section v-if="tab === 'billing' && !isAnonymous" class="pp-section">
        <UsageIndicator
          :consumption="usage.consumption"
          :limit="usage.limit"
          :remaining="usage.remaining"
          :plan="usage.plan"
        />

        <div class="pp-card">
          <div class="pp-section-label">Plans</div>
          <p class="pp-plan-line">Free: 25MB across all owned boards.</p>
          <p class="pp-plan-line">Paid: 1GB across all owned boards.</p>
          <p class="pp-note">Plan management and checkout are not included in this phase.</p>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <Transition name="pp-overlay">
        <div v-if="showDeleteConfirm" class="pp-confirm-overlay" @click.self="showDeleteConfirm = false">
          <div class="pp-confirm-dialog">
            <h3 class="pp-confirm-title">Delete board?</h3>
            <p class="pp-confirm-text">
              <strong>{{ boardTitle }}</strong> and all its contents will be permanently deleted.
            </p>
            <div class="pp-confirm-actions">
              <button class="pp-confirm-cancel" @click="showDeleteConfirm = false">Cancel</button>
              <button class="pp-confirm-delete" :disabled="deleting" @click="deleteBoard">
                {{ deleting ? 'Deleting...' : 'Delete board' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </Drawer>
</template>

<style scoped>
.pp-header {
  font-size: 16px;
  font-weight: 650;
  color: #111827;
}

.pp-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pp-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
}

.pp-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #EFF6FF;
  color: #1D4ED8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.pp-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pp-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.pp-handle,
.pp-email {
  font-size: 12px;
  color: #6B7280;
}

.pp-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.pp-tab {
  height: 34px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.pp-tab--on {
  background: #EFF6FF;
  color: #1D4ED8;
  border-color: #BFDBFE;
}

.pp-tab--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pp-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pp-card {
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
}

.pp-section-label {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 6px;
}

.pp-section-hint,
.pp-note,
.pp-status,
.pp-plan-line,
.pp-board-meta,
.pp-board-role {
  margin: 0;
  font-size: 12px;
  color: #6B7280;
}

.pp-username-field {
  height: 38px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  margin-bottom: 8px;
}

.pp-at {
  color: #9CA3AF;
  margin-right: 3px;
}

.pp-username-input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 13px;
}

.pp-btn {
  border: none;
  border-radius: 8px;
  height: 34px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.pp-btn--primary {
  color: #fff;
  background: #2563EB;
}

.pp-btn--danger {
  color: #fff;
  background: #DC2626;
  margin-top: 8px;
}

.pp-oauth-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pp-oauth-btn {
  height: 34px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  text-decoration: none;
  color: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.pp-board-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 3px;
}

.pp-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.4);
}

.pp-confirm-dialog {
  width: 320px;
  border-radius: 12px;
  background: #fff;
  padding: 16px;
  border: 1px solid #E5E7EB;
}

.pp-confirm-title {
  margin: 0;
  font-size: 15px;
  color: #111827;
}

.pp-confirm-text {
  margin: 8px 0 0;
  font-size: 12px;
  color: #6B7280;
}

.pp-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.pp-confirm-cancel,
.pp-confirm-delete {
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.pp-confirm-cancel {
  background: #F3F4F6;
  color: #374151;
}

.pp-confirm-delete {
  background: #DC2626;
  color: #fff;
}

.pp-overlay-enter-active,
.pp-overlay-leave-active {
  transition: opacity 0.16s ease;
}

.pp-overlay-enter-from,
.pp-overlay-leave-to {
  opacity: 0;
}
</style>
