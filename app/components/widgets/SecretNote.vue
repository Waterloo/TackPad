<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import { useSecurityStore } from '~/stores/security'
import type { SecretNoteValue, SecretNoteWidget } from '~/shared/types/board'
import type { RecipientKeyMaterial } from '~/utils/secretCrypto'
import WidgetOptions from './WidgetOptions.vue'
import SecretShareDialog from './SecretShareDialog.vue'

const props = defineProps<{ itemId: string }>()

const boardStore = useBoardStore()
const authStore = useAuthStore()
const securityStore = useSecurityStore()
const toast = useToast()

const item = computed(() => boardStore.items.get(props.itemId) as SecretNoteWidget | undefined)
const isOwner = computed(() => item.value?.createdBy === authStore.profile?.id)
const hasAccess = computed(() => !!item.value?.content.recipients.some(r => r.profileId === authStore.profile?.id))
const sharedCount = computed(() => Math.max(0, (item.value?.content.recipients.length ?? 1) - 1))

const unlockedText = ref('')
const isUnlocked = ref(false)
const busy = ref(false)
const error = ref('')
const shareOpen = ref(false)
let autoUnlockAttempted = false

async function unlock() {
  if (!item.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const payload = await securityStore.decryptForCurrentUser<SecretNoteValue>(item.value.content)
    unlockedText.value = payload.text
    isUnlocked.value = true
  }
  catch (err: any) {
    error.value = err?.message ?? 'Could not unlock this secret.'
  }
  finally {
    busy.value = false
  }
}

function hideSecret() {
  isUnlocked.value = false
  error.value = ''
}

async function getRecipientMaterials(recipientIds: string[]): Promise<RecipientKeyMaterial[]> {
  const members = await $fetch<Array<{ id: string; publicKey: string | null }>>(`/api/board/${boardStore.boardId}/members`)
  return members
    .filter(member => recipientIds.includes(member.id) && member.publicKey)
    .map(member => ({ profileId: member.id, publicKey: member.publicKey! }))
}

async function saveCurrentText(recipientMaterials?: RecipientKeyMaterial[]) {
  if (!item.value || !isOwner.value) return
  busy.value = true
  error.value = ''
  try {
    const recipients = recipientMaterials
      ?? await getRecipientMaterials(item.value.content.recipients.map(r => r.profileId))
    const encrypted = await securityStore.encryptForRecipients(
      { text: unlockedText.value },
      recipients,
    )
    boardStore.updateItem(props.itemId, { content: encrypted })
  }
  catch (err: any) {
    error.value = err?.message ?? 'Could not save this secret.'
  }
  finally {
    busy.value = false
  }
}

async function saveRecipients(recipients: Array<{ profileId: string; publicKey: string }>) {
  if (!item.value) return
  if (!isUnlocked.value) await unlock()
  if (!isUnlocked.value) return
  await saveCurrentText(recipients)
  toast.add({
    severity: 'success',
    summary: 'Recipients updated',
    detail: recipients.length ? 'Encrypted access was updated.' : 'This secret is now private to you.',
    life: 2200,
  })
}

async function copyOneOffLink() {
  if (!item.value || !isOwner.value) return
  if (!isUnlocked.value) await unlock()
  if (!isUnlocked.value) return

  try {
    const link = await securityStore.createOneOffLink('secret_note', { text: unlockedText.value })
    await navigator.clipboard.writeText(link)
    toast.add({
      severity: 'success',
      summary: 'One-off link copied',
      detail: 'The next person to open it can reveal this secret once.',
      life: 2600,
    })
  }
  catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Could not create link',
      detail: err?.message ?? 'Try again in a moment.',
      life: 2800,
    })
  }
}

async function copySecretText() {
  if (!hasAccess.value) return
  if (!isUnlocked.value) await unlock()
  if (!isUnlocked.value) return

  try {
    await navigator.clipboard.writeText(unlockedText.value)
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Secret text copied to clipboard.',
      life: 1800,
    })
  }
  catch {
    toast.add({
      severity: 'error',
      summary: 'Copy failed',
      detail: 'Could not access clipboard.',
      life: 2200,
    })
  }
}

watch(item, (nextItem) => {
  if (!nextItem || autoUnlockAttempted) return
  if (nextItem.createdBy === authStore.profile?.id) {
    autoUnlockAttempted = true
    void unlock()
  }
}, { immediate: true })
</script>

<template>
  <div v-if="item" class="sn-root">
    <WidgetOptions :item-id="itemId">
      <button class="sn-tool" :disabled="busy || !hasAccess" @click.stop="isUnlocked ? hideSecret() : void unlock()">
        {{ isUnlocked ? 'Hide' : 'Unlock' }}
      </button>
      <button class="sn-tool" :disabled="busy || !hasAccess" @click.stop="void copySecretText()">Copy</button>
      <button v-if="isOwner" class="sn-tool" :disabled="busy" @click.stop="shareOpen = true">Share</button>
      <button v-if="isOwner" class="sn-tool" :disabled="busy" @click.stop="void copyOneOffLink()">Link</button>
    </WidgetOptions>

    <div v-if="!isUnlocked" class="sn-locked">
      <div class="sn-lock-icon">Locked</div>
      <p class="sn-title">{{ item.displayName || 'Encrypted note' }}</p>
      <p class="sn-meta">
        <template v-if="hasAccess">Only authorized recipients can read this note.</template>
        <template v-else>You are not a recipient for this encrypted note.</template>
      </p>
      <p v-if="sharedCount > 0" class="sn-share-count">Shared with {{ sharedCount }} {{ sharedCount === 1 ? 'person' : 'people' }}</p>
      <button v-if="hasAccess" class="sn-unlock-btn" :disabled="busy" @click="void unlock()">
        {{ busy ? 'Unlocking...' : 'Unlock note' }}
      </button>
      <p v-if="error" class="sn-error">{{ error }}</p>
    </div>

    <div v-else class="sn-open">
      <textarea
        v-model="unlockedText"
        class="sn-editor"
        :readonly="!isOwner"
        placeholder="Write something private..."
        @blur="void saveCurrentText()"
        @click.stop
        @pointerdown.stop
      />
      <p v-if="sharedCount > 0" class="sn-foot">Shared with {{ sharedCount }} {{ sharedCount === 1 ? 'person' : 'people' }}</p>
      <p v-if="!isOwner" class="sn-foot">View-only shared secret</p>
      <p v-if="error" class="sn-error">{{ error }}</p>
    </div>

    <SecretShareDialog
      v-model="shareOpen"
      :board-id="boardStore.boardId"
      :selected-recipient-ids="item.content.recipients.filter(r => r.profileId !== authStore.profile?.id).map(r => r.profileId)"
      @save="saveRecipients"
    />
  </div>
</template>

<style scoped>
.sn-root {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(180deg, #0F172A 0%, #111827 100%);
  color: #F9FAFB;
  overflow: hidden;
}

.sn-tool {
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 7px;
  background: #F3F4F6;
  color: #111827;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.sn-locked,
.sn-open {
  width: 100%;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.sn-lock-icon {
  display: inline-flex;
  align-self: flex-start;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sn-title {
  margin: 16px 0 8px;
  font-size: 18px;
  font-weight: 650;
}

.sn-meta,
.sn-share-count,
.sn-foot {
  margin: 0;
  color: rgba(255, 255, 255, 0.74);
  font-size: 13px;
  line-height: 1.45;
}

.sn-share-count,
.sn-foot {
  margin-top: auto;
}

.sn-unlock-btn {
  margin-top: 16px;
  align-self: flex-start;
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: 9px;
  background: #FDE68A;
  color: #111827;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.sn-editor {
  width: 100%;
  height: 100%;
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: #F9FAFB;
  font-size: 14px;
  line-height: 1.6;
}

.sn-editor::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.sn-error {
  margin: 10px 0 0;
  color: #FCA5A5;
  font-size: 12px;
}
</style>
