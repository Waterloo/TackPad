export function parseObjectKeyFromUrl(fileUrl: string, bucket: string): string | null {
  if (!fileUrl) return null

  // Legacy fallback: sometimes file_url may already be a raw object key.
  if (!fileUrl.includes('://') && !fileUrl.startsWith('/')) return fileUrl

  try {
    const url = new URL(fileUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    const bucketIndex = parts.indexOf(bucket)
    if (bucketIndex === -1) return parts.length ? parts[parts.length - 1] : null
    const key = parts.slice(bucketIndex + 1).join('/')
    return key || null
  }
  catch {
    return null
  }
}
