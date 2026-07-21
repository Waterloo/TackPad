import type {
  EncryptedContentBlob,
  EncryptedRecipientEnvelope,
  SecretKeyValueData,
  SecretNoteValue,
} from '~/shared/types/board'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type SecretPlaintext = SecretNoteValue | SecretKeyValueData

export interface RecipientKeyMaterial {
  profileId: string
  publicKey: string
}

export interface EncryptedPrivateKeyBackup {
  encryptedPrivateKey: string
  backupSalt: string
  backupIv: string
  backupVersion: number
}

export function bytesToBase64(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function normalizeBase64(input: string): string {
  const trimmed = input.trim()
  // Some clients turn '+' into spaces when links are copied through
  // query-like parsers. Convert spaces back to '+' before decoding.
  const withPlus = trimmed.replace(/ /g, '+').replace(/[\n\r\t]/g, '')
  const normalized = withPlus
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const paddingLength = normalized.length % 4
  if (paddingLength === 0) return normalized
  return normalized.padEnd(normalized.length + (4 - paddingLength), '=')
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(normalizeBase64(base64))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  return bytesToBase64(await crypto.subtle.exportKey('spki', publicKey))
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  return bytesToBase64(await crypto.subtle.exportKey('pkcs8', privateKey))
}

export async function importPublicKey(publicKey: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'spki',
    base64ToBytes(publicKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt'],
  )
}

export async function importPrivateKey(privateKey: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'pkcs8',
    base64ToBytes(privateKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt'],
  )
}

export async function generateEncryptionKeyPair() {
  return await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  ) as CryptoKeyPair
}

export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex.match(/.{1,4}/g)?.join('-').toUpperCase() ?? hex.toUpperCase()
}

async function deriveRecoveryKey(recoveryCode: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(recoveryCode),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250000,
      hash: 'SHA-256',
    },
    material,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptPrivateKeyBackup(privateKey: string, recoveryCode: string): Promise<EncryptedPrivateKeyBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveRecoveryKey(recoveryCode, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(privateKey),
  )

  return {
    encryptedPrivateKey: bytesToBase64(ciphertext),
    backupSalt: bytesToBase64(salt),
    backupIv: bytesToBase64(iv),
    backupVersion: 1,
  }
}

export async function decryptPrivateKeyBackup(
  backup: EncryptedPrivateKeyBackup,
  recoveryCode: string,
): Promise<string> {
  const salt = base64ToBytes(backup.backupSalt)
  const iv = base64ToBytes(backup.backupIv)
  const key = await deriveRecoveryKey(recoveryCode, salt)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    base64ToBytes(backup.encryptedPrivateKey),
  )
  return decoder.decode(decrypted)
}

export async function encryptSecretPayload(
  payload: SecretPlaintext,
  recipients: RecipientKeyMaterial[],
): Promise<EncryptedContentBlob> {
  const contentKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  const rawContentKey = await crypto.subtle.exportKey('raw', contentKey)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    contentKey,
    encoder.encode(JSON.stringify(payload)),
  )

  const recipientEnvelopes: EncryptedRecipientEnvelope[] = []
  for (const recipient of recipients) {
    const publicKey = await importPublicKey(recipient.publicKey)
    const wrappedKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      rawContentKey,
    )
    recipientEnvelopes.push({
      profileId: recipient.profileId,
      wrappedKey: bytesToBase64(wrappedKey),
      addedAt: new Date().toISOString(),
    })
  }

  return {
    version: 1,
    algorithm: 'aes-gcm',
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    recipients: recipientEnvelopes,
  }
}

export async function decryptSecretPayload<T extends SecretPlaintext>(
  content: EncryptedContentBlob,
  profileId: string,
  privateKey: CryptoKey,
): Promise<T> {
  const recipientEnvelope = content.recipients.find(r => r.profileId === profileId)
  if (!recipientEnvelope) {
    throw new Error('You do not have access to this encrypted item.')
  }

  const rawContentKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    base64ToBytes(recipientEnvelope.wrappedKey),
  )

  const contentKey = await crypto.subtle.importKey(
    'raw',
    rawContentKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(content.iv) },
    contentKey,
    base64ToBytes(content.ciphertext),
  )

  return JSON.parse(decoder.decode(decrypted)) as T
}

export async function encryptOneOffSecret(payload: SecretPlaintext) {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  const rawKey = await crypto.subtle.exportKey('raw', key)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  )

  return {
    key: bytesToBase64(rawKey),
    payload: {
      version: 1 as const,
      algorithm: 'aes-gcm' as const,
      ciphertext: bytesToBase64(ciphertext),
      iv: bytesToBase64(iv),
    },
  }
}

export async function decryptOneOffSecret<T extends SecretPlaintext>(
  payload: { ciphertext: string; iv: string },
  base64Key: string,
): Promise<T> {
  assertOneOffKeyFormat(base64Key)
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(base64Key),
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext),
  )

  return JSON.parse(decoder.decode(decrypted)) as T
}

export function assertOneOffKeyFormat(base64Key: string): void {
  const rawKey = base64ToBytes(base64Key)
  if (rawKey.byteLength !== 16 && rawKey.byteLength !== 32) {
    throw new Error('Invalid secret key format in link. Request a new one-time link.')
  }
}
