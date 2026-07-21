const TOKEN_VERSION = 'v1'

function toBase64Url(bytes: Uint8Array): string {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

function payloadString(uploadId: string, boardId: string, exp: number): string {
  return `${TOKEN_VERSION}:${uploadId}:${boardId}:${exp}`
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return toBase64Url(new Uint8Array(sig))
}

export async function createUploadAccessToken(
  input: { uploadId: string, boardId: string, exp: number },
  secret: string,
) {
  const payload = payloadString(input.uploadId, input.boardId, input.exp)
  return await hmacSign(payload, secret)
}

export async function verifyUploadAccessToken(
  input: { uploadId: string, boardId: string, exp: number, sig: string },
  secret: string,
) {
  const payload = payloadString(input.uploadId, input.boardId, input.exp)
  const expected = await hmacSign(payload, secret)
  return timingSafeEqual(expected, input.sig)
}
