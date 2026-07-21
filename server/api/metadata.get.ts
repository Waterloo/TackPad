const UA = 'TackPad/2.0 (link preview bot)'

function normalize(input: unknown): string | null {
  return typeof input === 'string' && input.trim() ? input.trim() : null
}

function toAbsoluteUrl(value: string | null | undefined, base: string): string | null {
  if (!value) return null
  try { return new URL(value, base).toString() } catch { return null }
}

function getProviderOEmbedEndpoint(url: URL): string | null {
  const encoded = encodeURIComponent(url.toString())
  const host = url.hostname.replace(/^www\./, '').toLowerCase()

  if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') {
    return `https://www.youtube.com/oembed?url=${encoded}&format=json`
  }
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    return `https://vimeo.com/api/oembed.json?url=${encoded}`
  }
  return null
}

function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function sanitizeOEmbedHtml(input: string): string | null {
  const iframeMatch = input.match(/<iframe[\s\S]*?<\/iframe>/i)
  if (!iframeMatch) return null
  const iframe = iframeMatch[0]
  const src = iframe.match(/\ssrc=["']([^"']+)["']/i)?.[1]
  if (!src) return null

  let parsed: URL
  try { parsed = new URL(src) } catch { return null }
  if (!['http:', 'https:'].includes(parsed.protocol)) return null

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
  const allowlist = new Set([
    'youtube.com',
    'youtube-nocookie.com',
    'youtu.be',
    'player.vimeo.com',
    'vimeo.com',
    'open.spotify.com',
  ])
  const isAllowed = [...allowlist].some(allowed => host === allowed || host.endsWith(`.${allowed}`))
  if (!isAllowed) return null

  const width = iframe.match(/\swidth=["'](\d+)["']/i)?.[1] ?? '560'
  const height = iframe.match(/\sheight=["'](\d+)["']/i)?.[1] ?? '315'
  const allow = iframe.match(/\sallow=["']([^"']+)["']/i)?.[1]
    ?? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
  const safeSrc = escapeAttr(parsed.toString())
  const safeAllow = escapeAttr(allow)

  return `<iframe src="${safeSrc}" width="${width}" height="${height}" frameborder="0" allow="${safeAllow}" allowfullscreen loading="lazy"></iframe>`
}

async function fetchOEmbed(endpoint: string, sourceUrl: string) {
  try {
    const data = await fetch(endpoint, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000),
    }).then(r => r.ok ? r.json() : null)
    if (!data || typeof data !== 'object') return null
    return {
      title: normalize((data as any).title),
      description: normalize((data as any).author_name),
      image: toAbsoluteUrl(normalize((data as any).thumbnail_url), sourceUrl),
      oEmbed: sanitizeOEmbedHtml(normalize((data as any).html) ?? '') ?? null,
    }
  }
  catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const url = String(query.url ?? '').trim()

  if (!url) throw createError({ statusCode: 400, message: 'url is required' })

  let parsedUrl: URL
  try { parsedUrl = new URL(url) }
  catch { throw createError({ statusCode: 400, message: 'Invalid URL' }) }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw createError({ statusCode: 400, message: 'Invalid URL protocol' })
  }

  let providerMeta: { title: string | null, description: string | null, image: string | null, oEmbed: string | null } | null = null
  const providerEndpoint = getProviderOEmbedEndpoint(parsedUrl)
  if (providerEndpoint) {
    providerMeta = await fetchOEmbed(providerEndpoint, parsedUrl.toString())
  }

  let pageTitle: string | null = null
  let pageDescription: string | null = null
  let pageImage: string | null = null
  let discoveredOEmbed: string | null = null

  try {
    const pageHtml = await fetch(parsedUrl.toString(), {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    }).then(r => r.ok ? r.text() : null)

    if (pageHtml) {
      const meta = (name: string): string | null => {
        const patterns = [
          new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
          new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
          new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
          new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
        ]
        for (const re of patterns) {
          const m = pageHtml.match(re)
          if (m?.[1]) return m[1].trim()
        }
        return null
      }

      const titleTag = () => {
        const m = pageHtml.match(/<title[^>]*>([^<]+)<\/title>/i)
        return m?.[1]?.trim() ?? null
      }

      pageTitle = meta('og:title') ?? meta('twitter:title') ?? titleTag()
      pageDescription = meta('og:description') ?? meta('twitter:description') ?? meta('description')
      pageImage = toAbsoluteUrl(meta('og:image') ?? meta('twitter:image'), parsedUrl.toString())

      if (!providerMeta?.oEmbed) {
        const oEmbedUrl = pageHtml.match(/<link[^>]+type=["']application\/json\+oembed["'][^>]+href=["']([^"']+)["']/i)?.[1]
          ?? pageHtml.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/json\+oembed["']/i)?.[1]
        const absoluteEndpoint = toAbsoluteUrl(oEmbedUrl ?? null, parsedUrl.toString())
        if (absoluteEndpoint) {
          discoveredOEmbed = (await fetchOEmbed(absoluteEndpoint, parsedUrl.toString()))?.oEmbed ?? null
        }
      }
    }
  }
  catch {
    // fallback below
  }

  return {
    title: pageTitle ?? providerMeta?.title ?? null,
    description: pageDescription ?? providerMeta?.description ?? null,
    image: pageImage ?? providerMeta?.image ?? null,
    oEmbed: providerMeta?.oEmbed ?? discoveredOEmbed ?? null,
  }
})
