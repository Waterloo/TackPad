<script setup lang="ts">
import { nanoid } from 'nanoid'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import { useSecurityStore } from '~/stores/security'
import type { SecretKeyValueData, SecretKeyValueEntry, SecretKeyValueWidget } from '~/shared/types/board'
import type { RecipientKeyMaterial } from '~/utils/secretCrypto'
import WidgetOptions from './WidgetOptions.vue'
import SecretShareDialog from './SecretShareDialog.vue'

const props = defineProps<{ itemId: string }>()

const boardStore = useBoardStore()
const authStore = useAuthStore()
const securityStore = useSecurityStore()
const toast = useToast()

const item = computed(() => boardStore.items.get(props.itemId) as SecretKeyValueWidget | undefined)
const isOwner = computed(() => item.value?.createdBy === authStore.profile?.id)
const hasAccess = computed(() => !!item.value?.content.recipients.some(r => r.profileId === authStore.profile?.id))
const sharedCount = computed(() => Math.max(0, (item.value?.content.recipients.length ?? 1) - 1))

const entries = ref<SecretKeyValueEntry[]>([])
const isUnlocked = ref(false)
const busy = ref(false)
const error = ref('')
const shareOpen = ref(false)
const copiedFieldKey = ref<string | null>(null)
let autoUnlockAttempted = false

async function unlock() {
  if (!item.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const payload = await securityStore.decryptForCurrentUser<SecretKeyValueData>(item.value.content)
    entries.value = payload.entries.length ? payload.entries : [{ id: nanoid(8), key: '', value: '' }]
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

async function saveCurrentEntries(recipientMaterials?: RecipientKeyMaterial[]) {
  if (!item.value || !isOwner.value) return
  busy.value = true
  error.value = ''
  try {
    const recipients = recipientMaterials
      ?? await getRecipientMaterials(item.value.content.recipients.map(r => r.profileId))
    const encrypted = await securityStore.encryptForRecipients(
      {
        entries: entries.value.map(entry => ({
          id: entry.id,
          key: entry.key,
          value: entry.value,
        })),
      },
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

function addEntry() {
  entries.value.push({ id: nanoid(8), key: '', value: '' })
}

function removeEntry(entryId: string) {
  entries.value = entries.value.filter(entry => entry.id !== entryId)
  if (entries.value.length === 0) addEntry()
  void saveCurrentEntries()
}

async function saveRecipients(recipients: Array<{ profileId: string; publicKey: string }>) {
  if (!isUnlocked.value) await unlock()
  if (!isUnlocked.value) return
  await saveCurrentEntries(recipients)
  toast.add({
    severity: 'success',
    summary: 'Recipients updated',
    detail: recipients.length ? 'Encrypted access was updated.' : 'This secret is now private to you.',
    life: 2200,
  })
}

async function copyOneOffLink() {
  if (!isOwner.value) return
  if (!isUnlocked.value) await unlock()
  if (!isUnlocked.value) return

  try {
    const link = await securityStore.createOneOffLink('secret_kv', { entries: entries.value })
    await navigator.clipboard.writeText(link)
    toast.add({
      severity: 'success',
      summary: 'One-off link copied',
      detail: 'The next person to open it can reveal these keys once.',
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

function buildCopyText(): string {
  return entries.value
    .map(entry => `${entry.key || 'Untitled key'}: ${entry.value || ''}`)
    .join('\n')
}

async function copyAllEntries() {
  if (!hasAccess.value) return
  if (!isUnlocked.value) await unlock()
  if (!isUnlocked.value) return

  try {
    await navigator.clipboard.writeText(buildCopyText())
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'All key/value pairs copied to clipboard.',
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

function isFieldRecentlyCopied(fieldKey: string): boolean {
  return copiedFieldKey.value === fieldKey
}

function markCopiedField(fieldKey: string) {
  copiedFieldKey.value = fieldKey
  setTimeout(() => {
    if (copiedFieldKey.value === fieldKey) {
      copiedFieldKey.value = null
    }
  }, 1600)
}

async function copyEntryPart(value: string, label: string, fieldKey: string) {
  if (!hasAccess.value) return
  if (!isUnlocked.value) await unlock()
  if (!isUnlocked.value) return

  try {
    await navigator.clipboard.writeText(value)
    markCopiedField(fieldKey)
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: `${label} copied to clipboard.`,
      life: 1600,
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
  <div v-if="item" class="skv-root">
    <WidgetOptions :item-id="itemId">
      <button class="skv-tool" :disabled="busy || !hasAccess" @click.stop="isUnlocked ? hideSecret() : void unlock()">
        {{ isUnlocked ? 'Hide' : 'Unlock' }}
      </button>
      <button class="skv-tool" :disabled="busy || !hasAccess" @click.stop="void copyAllEntries()">Copy all</button>
      <button v-if="isOwner" class="skv-tool" :disabled="busy" @click.stop="shareOpen = true">Share</button>
      <button v-if="isOwner" class="skv-tool" :disabled="busy" @click.stop="void copyOneOffLink()">Link</button>
    </WidgetOptions>

    <div v-if="!isUnlocked" class="skv-locked">
      <div class="skv-badge">Encrypted keys</div>
      <h3>{{ item.displayName || 'Encrypted key/value pairs' }}</h3>
      <p>
        <template v-if="hasAccess">Unlock to view credential pairs and copy them when needed.</template>
        <template v-else>You are not a recipient for this encrypted item.</template>
      </p>
      <p v-if="sharedCount > 0" class="skv-foot">Shared with {{ sharedCount }} {{ sharedCount === 1 ? 'person' : 'people' }}</p>
      <button v-if="hasAccess" class="skv-unlock-btn" :disabled="busy" @click="void unlock()">
        {{ busy ? 'Unlocking...' : 'Unlock keys' }}
      </button>
      <p v-if="error" class="skv-error">{{ error }}</p>
    </div>

    <div v-else class="skv-open">
      <div class="skv-head">
        <span class="skv-k">Key</span>
        <span class="skv-v">Value</span>
      </div>

      <div class="skv-list">
        <div v-for="entry in entries" :key="entry.id" class="skv-row">
          <div class="skv-field">
            <input
              v-model="entry.key"
              class="skv-input"
              :readonly="!isOwner"
              placeholder="API_KEY"
              @blur="void saveCurrentEntries()"
              @click.stop
              @pointerdown.stop
            />
            <button
              class="skv-copy-inline"
              title="Copy key"
              @click.stop="void copyEntryPart(entry.key || '', 'Key', `${entry.id}:key`)"
            >
              <svg
                v-if="!isFieldRecentlyCopied(`${entry.id}:key`)"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <svg
                v-else
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
          </div>
          <div class="skv-field">
            <input
              v-model="entry.value"
              class="skv-input"
              :readonly="!isOwner"
              placeholder="secret value"
              @blur="void saveCurrentEntries()"
              @click.stop
              @pointerdown.stop
            />
            <button
              class="skv-copy-inline"
              title="Copy value"
              @click.stop="void copyEntryPart(entry.value || '', 'Value', `${entry.id}:value`)"
            >
              <svg
                v-if="!isFieldRecentlyCopied(`${entry.id}:value`)"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <svg
                v-else
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
          </div>
          <button v-if="isOwner" class="skv-remove" title="Remove pair" @click.stop="removeEntry(entry.id)">×</button>
          <span v-else class="skv-remove-spacer" />
        </div>
      </div>

      <button v-if="isOwner" class="skv-add" @click.stop="addEntry">Add pair</button>
      <p v-if="sharedCount > 0" class="skv-foot">Shared with {{ sharedCount }} {{ sharedCount === 1 ? 'person' : 'people' }}</p>
      <p v-if="!isOwner" class="skv-foot">View-only shared secret</p>
      <p v-if="error" class="skv-error">{{ error }}</p>
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
.skv-root {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  background: linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%);
}

.skv-tool {
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 7px;
  background: #111827;
  color: #F9FAFB;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.skv-locked,
.skv-open {
  width: 100%;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.skv-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 4px 8px;
  border-radius: 999px;
  background: #111827;
  color: #F9FAFB;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.skv-locked h3 {
  margin: 14px 0 8px;
  font-size: 18px;
  color: #111827;
}

.skv-locked p,
.skv-foot {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #6B7280;
}

.skv-foot {
  margin-top: auto;
}

.skv-unlock-btn,
.skv-add {
  margin-top: 14px;
  align-self: flex-start;
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: 9px;
  background: #111827;
  color: #F9FAFB;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.skv-head,
.skv-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.skv-head {
  margin-bottom: 8px;
  color: #6B7280;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.skv-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.skv-input {
  height: 36px;
  width: 100%;
  padding: 0 36px 0 10px;
  border-radius: 9px;
  border: 1px solid #E5E7EB;
  background: rgba(255, 255, 255, 0.82);
  color: #111827;
}

.skv-remove {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: #FEE2E2;
  color: #B91C1C;
  font-size: 18px;
  cursor: pointer;
}

.skv-field {
  position: relative;
}

.skv-copy-inline {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: #E5E7EB;
  color: #111827;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.skv-copy-inline svg {
  display: block;
}

.skv-remove-spacer {
  width: 28px;
  height: 28px;
}

.skv-error {
  margin: 10px 0 0;
  color: #B91C1C;
  font-size: 12px;
}
</style>
