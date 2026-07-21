import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import {
  decryptPrivateKeyBackup,
  decryptSecretPayload,
  encryptOneOffSecret,
  encryptPrivateKeyBackup,
  encryptSecretPayload,
  exportPrivateKey,
  exportPublicKey,
  generateEncryptionKeyPair,
  generateRecoveryCode,
  importPrivateKey,
  type RecipientKeyMaterial,
  type SecretPlaintext,
} from '~/utils/secretCrypto'
import type {
  EncryptedContentBlob,
  SecretKeyValueData,
  SecretNoteValue,
} from '~/shared/types/board'

interface KeyStatusResponse {
  hasKey: boolean
  publicKey: string | null
  backupVersion: number | null
  updatedAt: string | null
}

interface KeyBackupResponse {
  publicKey: string
  encryptedPrivateKey: string
  backupSalt: string
  backupIv: string
  backupVersion: number
}

function localPrivateKeyStorageKey(profileId: string): string {
  return `tp-secret-private-${profileId}`
}

export const useSecurityStore = defineStore('security', () => {
  const authStore = useAuthStore()

  const publicKey = ref<string | null>(null)
  const hasKey = ref(false)
  const isLoaded = ref(false)
  const privateKey = shallowRef<CryptoKey | null>(null)

  const recoveryCodePromptOpen = ref(false)
  const generatedRecoveryCode = ref('')
  let recoveryCodePromptResolve: ((value: boolean) => void) | null = null

  const restorePromptOpen = ref(false)
  const restoreError = ref('')
  const restoreBusy = ref(false)
  let restorePromptResolve: ((value: boolean) => void) | null = null

  function resetState() {
    publicKey.value = null
    hasKey.value = false
    isLoaded.value = false
    privateKey.value = null
    recoveryCodePromptOpen.value = false
    generatedRecoveryCode.value = ''
    restorePromptOpen.value = false
    restoreError.value = ''
    restoreBusy.value = false
    recoveryCodePromptResolve = null
    restorePromptResolve = null
  }

  async function fetchKeyStatus(force = false) {
    if (isLoaded.value && !force) return
    if (!authStore.profile?.id) return

    try {
      const res = await $fetch<KeyStatusResponse>('/api/profile/keys')
      publicKey.value = res.publicKey
      hasKey.value = res.hasKey
    }
    catch {
      publicKey.value = null
      hasKey.value = false
    }
    finally {
      isLoaded.value = true
    }
  }

  async function loadLocalPrivateKey(): Promise<CryptoKey | null> {
    if (privateKey.value) return privateKey.value
    const profileId = authStore.profile?.id
    if (!profileId || !import.meta.client) return null
    const encoded = localStorage.getItem(localPrivateKeyStorageKey(profileId))
    if (!encoded) return null

    try {
      privateKey.value = await importPrivateKey(encoded)
      return privateKey.value
    }
    catch {
      localStorage.removeItem(localPrivateKeyStorageKey(profileId))
      return null
    }
  }

  async function storeLocalPrivateKey(encodedPrivateKey: string): Promise<CryptoKey> {
    const profileId = authStore.profile?.id
    if (!profileId || !import.meta.client) throw new Error('No active profile for local key storage')
    localStorage.setItem(localPrivateKeyStorageKey(profileId), encodedPrivateKey)
    privateKey.value = await importPrivateKey(encodedPrivateKey)
    return privateKey.value
  }

  function confirmRecoveryCodeSaved() {
    recoveryCodePromptOpen.value = false
    recoveryCodePromptResolve?.(true)
    recoveryCodePromptResolve = null
  }

  function dismissRecoveryCodePrompt() {
    recoveryCodePromptOpen.value = false
    recoveryCodePromptResolve?.(false)
    recoveryCodePromptResolve = null
  }

  function openRecoveryCodePrompt(code: string): Promise<boolean> {
    generatedRecoveryCode.value = code
    recoveryCodePromptOpen.value = true
    return new Promise<boolean>((resolve) => {
      recoveryCodePromptResolve = resolve
    })
  }

  async function bootstrapKeys(): Promise<boolean> {
    const keyPair = await generateEncryptionKeyPair()
    const exportedPublicKey = await exportPublicKey(keyPair.publicKey)
    const exportedPrivateKey = await exportPrivateKey(keyPair.privateKey)
    const recoveryCode = generateRecoveryCode()
    const backup = await encryptPrivateKeyBackup(exportedPrivateKey, recoveryCode)

    await $fetch('/api/profile/keys/bootstrap', {
      method: 'POST',
      body: {
        publicKey: exportedPublicKey,
        encryptedPrivateKey: backup.encryptedPrivateKey,
        backupSalt: backup.backupSalt,
        backupIv: backup.backupIv,
        backupVersion: backup.backupVersion,
      },
    })

    publicKey.value = exportedPublicKey
    hasKey.value = true
    await storeLocalPrivateKey(exportedPrivateKey)
    return await openRecoveryCodePrompt(recoveryCode)
  }

  function openRestorePrompt(): Promise<boolean> {
    restoreError.value = ''
    restorePromptOpen.value = true
    return new Promise<boolean>((resolve) => {
      restorePromptResolve = resolve
    })
  }

  function dismissRestorePrompt() {
    restorePromptOpen.value = false
    restoreError.value = ''
    restorePromptResolve?.(false)
    restorePromptResolve = null
  }

  async function restoreWithRecoveryCode(recoveryCode: string): Promise<boolean> {
    restoreBusy.value = true
    restoreError.value = ''
    try {
      const backup = await $fetch<KeyBackupResponse>('/api/profile/keys/backup')
      const exportedPrivateKey = await decryptPrivateKeyBackup(backup, recoveryCode.trim())
      await storeLocalPrivateKey(exportedPrivateKey)
      publicKey.value = backup.publicKey
      hasKey.value = true
      restorePromptOpen.value = false
      restorePromptResolve?.(true)
      restorePromptResolve = null
      return true
    }
    catch {
      restoreError.value = 'Recovery code did not match this account backup.'
      return false
    }
    finally {
      restoreBusy.value = false
    }
  }

  async function ensureKeyMaterial(): Promise<boolean> {
    if (!authStore.profile?.id) {
      if (!authStore.isLoaded) await authStore.fetchProfile()
      if (!authStore.profile?.id) return false
    }

    await fetchKeyStatus()
    if (await loadLocalPrivateKey()) return true
    if (hasKey.value) {
      return await openRestorePrompt()
    }
    return await bootstrapKeys()
  }

  async function getPrivateKey(): Promise<CryptoKey> {
    const ready = await ensureKeyMaterial()
    if (!ready) throw new Error('Encryption keys are required to access secret items.')
    const key = await loadLocalPrivateKey()
    if (!key) throw new Error('Private encryption key is unavailable.')
    return key
  }

  async function getCurrentUserRecipient(): Promise<RecipientKeyMaterial> {
    const ready = await ensureKeyMaterial()
    if (!ready || !authStore.profile?.id || !publicKey.value) {
      throw new Error('Encryption keys are not ready yet.')
    }
    return {
      profileId: authStore.profile.id,
      publicKey: publicKey.value,
    }
  }

  async function encryptForRecipients(
    payload: SecretPlaintext,
    recipients: RecipientKeyMaterial[],
  ): Promise<EncryptedContentBlob> {
    const selfRecipient = await getCurrentUserRecipient()
    const recipientMap = new Map<string, RecipientKeyMaterial>([[selfRecipient.profileId, selfRecipient]])
    for (const recipient of recipients) {
      recipientMap.set(recipient.profileId, recipient)
    }
    return await encryptSecretPayload(payload, [...recipientMap.values()])
  }

  async function decryptForCurrentUser<T extends SecretPlaintext>(
    content: EncryptedContentBlob,
  ): Promise<T> {
    if (!authStore.profile?.id) throw new Error('Login session is unavailable.')
    const key = await getPrivateKey()
    return await decryptSecretPayload<T>(content, authStore.profile.id, key)
  }

  async function createOneOffLink(
    kind: 'secret_note' | 'secret_kv',
    payload: SecretNoteValue | SecretKeyValueData,
  ): Promise<string> {
    const encrypted = await encryptOneOffSecret(payload)
    const { id } = await $fetch<{ id: string }>('/api/secret-link/create', {
      method: 'POST',
      body: {
        kind,
        payload: encrypted.payload,
      },
    })

    return `${window.location.origin}/secret/${id}#k=${encodeURIComponent(encrypted.key)}`
  }

  return {
    publicKey,
    hasKey,
    isLoaded,
    recoveryCodePromptOpen,
    generatedRecoveryCode,
    restorePromptOpen,
    restoreError,
    restoreBusy,
    fetchKeyStatus,
    ensureKeyMaterial,
    getCurrentUserRecipient,
    encryptForRecipients,
    decryptForCurrentUser,
    createOneOffLink,
    confirmRecoveryCodeSaved,
    dismissRecoveryCodePrompt,
    dismissRestorePrompt,
    restoreWithRecoveryCode,
    resetState,
  }
})
