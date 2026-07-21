<script setup lang="ts">
import { assertOneOffKeyFormat, decryptOneOffSecret } from '~/utils/secretCrypto'
import { useSecurityStore } from '~/stores/security'
import type { SecretKeyValueData, SecretNoteValue } from '~/shared/types/board'

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const securityStore = useSecurityStore()
const secretId = computed(() => route.params.id as string)

const revealKey = ref('')
const loading = ref(false)
const revealedKind = ref<'secret_note' | 'secret_kv' | null>(null)
const noteValue = ref<SecretNoteValue | null>(null)
const kvValue = ref<SecretKeyValueData | null>(null)
const error = ref('')
const savingToVault = ref(false)
const saveStatus = ref<{ ok: boolean; msg: string } | null>(null)
const copyStatus = ref<{ ok: boolean; msg: string } | null>(null)

function readRevealKeyFromHash(): string {
  const hash = window.location.hash.replace(/^#/, '')
  const match = hash.match(/(?:^|&)k=([^&]*)/)
  if (!match) return ''

  try {
    return decodeURIComponent(match[1])
  }
  catch {
    return match[1]
  }
}

onMounted(() => {
  revealKey.value = readRevealKeyFromHash()
})

async function revealSecret() {
  if (!revealKey.value) {
    error.value = 'Missing decryption key in the secret link.'
    return
  }

  try {
    assertOneOffKeyFormat(revealKey.value)
  }
  catch (err: any) {
    error.value = err?.message ?? 'Invalid decryption key in the secret link.'
    return
  }

  loading.value = true
  error.value = ''
  saveStatus.value = null
  copyStatus.value = null
  try {
    const response = await $fetch<{
      kind: 'secret_note' | 'secret_kv'
      payload: { ciphertext: string; iv: string }
    }>(`/api/secret-link/${secretId.value}/reveal`, {
      method: 'POST',
    })

    revealedKind.value = response.kind
    if (response.kind === 'secret_note') {
      noteValue.value = await decryptOneOffSecret<SecretNoteValue>(response.payload, revealKey.value)
      kvValue.value = null
    }
    else {
      kvValue.value = await decryptOneOffSecret<SecretKeyValueData>(response.payload, revealKey.value)
      noteValue.value = null
    }
  }
  catch (err: any) {
    error.value = err?.data?.message ?? err?.message ?? 'This secret could not be revealed.'
  }
  finally {
    loading.value = false
  }
}

function getRevealedPayload(): SecretNoteValue | SecretKeyValueData | null {
  if (revealedKind.value === 'secret_note') return noteValue.value
  if (revealedKind.value === 'secret_kv') return kvValue.value
  return null
}

async function saveToVault() {
  const payload = getRevealedPayload()
  if (!payload || !revealedKind.value || savingToVault.value) return

  savingToVault.value = true
  saveStatus.value = null
  try {
    const encrypted = await securityStore.encryptForRecipients(payload, [])
    const response = await $fetch<{ ok: boolean; boardId: string }>(
      '/api/board/vault/import-secret',
      {
        method: 'POST',
        body: {
          kind: revealedKind.value,
          content: encrypted,
          displayName: revealedKind.value === 'secret_note' ? 'Saved Secret Note' : 'Saved Secret Keys',
        },
      },
    )
    saveStatus.value = { ok: true, msg: 'Saved to your vault.' }
    await router.push(`/board/${response.boardId}`)
  }
  catch (err: any) {
    saveStatus.value = { ok: false, msg: err?.data?.message ?? err?.message ?? 'Could not save to vault.' }
  }
  finally {
    savingToVault.value = false
  }
}

function buildCopyTextFromPayload(payload: SecretNoteValue | SecretKeyValueData): string {
  if ('text' in payload) return payload.text
  return payload.entries
    .map(entry => `${entry.key || 'Untitled key'}: ${entry.value || ''}`)
    .join('\n')
}

async function copyRevealedData() {
  const payload = getRevealedPayload()
  if (!payload) return

  copyStatus.value = null
  try {
    await navigator.clipboard.writeText(buildCopyTextFromPayload(payload))
    copyStatus.value = { ok: true, msg: 'Copied to clipboard.' }
  }
  catch {
    copyStatus.value = { ok: false, msg: 'Could not copy to clipboard.' }
  }
}
</script>

<template>
  <main class="sec-shell">
    <section class="sec-card">
      <div class="sec-badge">One-time secret</div>
      <h1>Reveal this secret once</h1>
      <p class="sec-copy">
        The encrypted content is decrypted locally in your browser. After a successful reveal, this link cannot be opened again.
      </p>

      <button v-if="!revealedKind" class="sec-btn" :disabled="loading" @click="void revealSecret()">
        {{ loading ? 'Revealing...' : 'Reveal secret' }}
      </button>

      <p v-if="error" class="sec-error">{{ error }}</p>

      <div v-if="noteValue" class="sec-result sec-result--note">
        <pre>{{ noteValue.text }}</pre>
      </div>

      <div v-if="kvValue" class="sec-result sec-result--kv">
        <div v-for="entry in kvValue.entries" :key="entry.id" class="sec-row">
          <span class="sec-key">{{ entry.key || 'Untitled key' }}</span>
          <span class="sec-value">{{ entry.value || 'Empty value' }}</span>
        </div>
      </div>

      <div v-if="revealedKind" class="sec-actions">
        <button class="sec-btn sec-btn--copy" @click="void copyRevealedData()">
          Copy
        </button>
        <button class="sec-btn sec-btn--alt" :disabled="savingToVault" @click="void saveToVault()">
          {{ savingToVault ? 'Saving...' : 'Save to my vault' }}
        </button>
      </div>
      <p v-if="copyStatus" class="sec-save-msg" :class="{ 'sec-save-msg--err': !copyStatus.ok }">
        {{ copyStatus.msg }}
      </p>
      <p v-if="saveStatus" class="sec-save-msg" :class="{ 'sec-save-msg--err': !saveStatus.ok }">
        {{ saveStatus.msg }}
      </p>
    </section>
  </main>
</template>

<style scoped>
.sec-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.08), transparent 35%),
    radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.12), transparent 30%),
    #F8FAFC;
  padding: 24px;
}

.sec-card {
  width: 640px;
  max-width: 100%;
  padding: 32px;
  border-radius: 22px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.05);
}

.sec-badge {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: 999px;
  background: #DBEAFE;
  color: #1D4ED8;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sec-card h1 {
  margin: 14px 0 8px;
  font-size: 30px;
  line-height: 1.1;
  color: #111827;
}

.sec-copy {
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.6;
  color: #6B7280;
}

.sec-btn {
  height: 42px;
  padding: 0 16px;
  border: none;
  border-radius: 11px;
  background: #111827;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.sec-error {
  margin: 14px 0 0;
  color: #DC2626;
  font-size: 13px;
}

.sec-actions {
  margin-top: 14px;
  display: flex;
  gap: 8px;
}

.sec-btn--alt {
  background: #1D4ED8;
}

.sec-btn--copy {
  background: #111827;
}

.sec-save-msg {
  margin: 10px 0 0;
  font-size: 13px;
  color: #059669;
}

.sec-save-msg--err {
  color: #DC2626;
}

.sec-result {
  margin-top: 18px;
  border-radius: 16px;
  border: 1px solid #E5E7EB;
  overflow: hidden;
}

.sec-result--note pre {
  margin: 0;
  padding: 18px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #111827;
  background: #0F172A;
  color: #F8FAFC;
}

.sec-row {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid #F3F4F6;
}

.sec-row:last-child {
  border-bottom: none;
}

.sec-key {
  font-size: 12px;
  font-weight: 700;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sec-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  color: #111827;
  word-break: break-word;
}

@media (max-width: 640px) {
  .sec-card {
    padding: 24px;
  }

  .sec-card h1 {
    font-size: 24px;
  }

  .sec-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>
