import { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
  try {
    // Add CORS handling for OPTIONS requests
    if (event.method === 'OPTIONS') {
      setResponseHeaders(event, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      })
      return null
    }

    // Extract URL from request
    const url = await extractUrlFromRequest(event)
    if (!url) {
      throw createError({
        statusCode: 400,
        message: 'URL is required.'
      })
    }

    if (!isValidUrl(url)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid URL format.'
      })
    }

    // Fetch metadata with timeout
    const metadata = await Promise.race([
      fetchMetadata(url),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      )
    ])

    return metadata

  } catch (error: any) {
    console.error('Error processing request:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Error processing request'
    })
  }
})

function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

async function extractUrlFromRequest(event: H3Event): Promise<string | null> {
  try {
    if (event.method === 'GET') {
      const query = getQuery(event)
      return query.url as string
    }
    
    if (event.method === 'POST') {
      const body = await readBody(event)
      return body.url
    }

    throw new Error('Unsupported request method')
  } catch (error) {
    console.error('Error extracting URL:', error)
    return null
  }
}

async function fetchMetadata(url: string) {
  const metadata = {
    url,
    timestamp: new Date().toISOString(),
    source: 'unknown'
  }

  try {
    // First attempt: Try oEmbed
    const oEmbedUrl = getOEmbedUrl(url)
    if (oEmbedUrl) {
      const oEmbedData = await fetchOEmbedDataWithTimeout(oEmbedUrl)
      if (oEmbedData) {
        return {
          ...metadata,
          source: 'oembed',
          data: oEmbedData
        }
      }
    }

    // Second attempt: Try HTML metadata
    const htmlMetadata = await fetchHtmlMetadataWithTimeout(url)
    if (htmlMetadata) {
      return {
        ...metadata,
        source: 'html',
        data: htmlMetadata
      }
    }

    // Fallback: Return basic URL info
    return {
      ...metadata,
      source: 'fallback',
      data: {
        title: new URL(url).hostname,
        url: url
      }
    }

  } catch (error: any) {
    console.error('Error fetching metadata:', error)
    return {
      ...metadata,
      source: 'error',
      error: error.message,
      data: {
        title: new URL(url).hostname,
        url: url
      }
    }
  }
}

function makeUrlAbsolute(baseUrl: string, relativeUrl: string | undefined): string {
  if (!relativeUrl) return '';
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch {
    return relativeUrl;
  }
}

async function fetchOEmbedDataWithTimeout(oEmbedUrl: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(oEmbedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Metadata-Fetcher/1.0'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = await response.json();
    
    // Make embedded iframes responsive
    if (data.html) {
      data.html = data.html.replace(/(width|height)=["']\d+["']/g, '$1="100%"');
    }

    // Make URLs absolute
    if (data.thumbnail_url) {
      data.thumbnail_url = makeUrlAbsolute(oEmbedUrl, data.thumbnail_url);
    }
    if (data.author_url) {
      data.author_url = makeUrlAbsolute(oEmbedUrl, data.author_url);
    }
    if (data.provider_url) {
      data.provider_url = makeUrlAbsolute(oEmbedUrl, data.provider_url);
    }
    
    return data;
  } catch (error) {
    console.error('oEmbed fetch error:', error);
    return null;
  }
}

async function fetchHtmlMetadataWithTimeout(url: string) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      console.log('HTML metadata fetch timeout')
      controller.abort()
    }, 15000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Metadata-Fetcher/1.0'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) return null;
    const html = await response.text();

    const metadata = {
      title: '',
      image: '',
      description: '',
      ogTags: {},
      metaTags: {}
    };

    // Extract metadata using regex
    metadata.title = extractMetaContent(html, 'title');
    let image = extractMetaContent(html, 'og:image') || extractMetaContent(html, 'twitter:image');
    metadata.image = makeUrlAbsolute(url, image);
    metadata.description = extractMetaContent(html, 'og:description') || extractMetaContent(html, 'description');

    // Extract and process OG tags
    const ogTags: Record<string, string> = {};
    const ogMatches = html.matchAll(/<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/gi);
    for (const match of ogMatches) {
      const value = match[2];
      if (match[1].includes('image') || match[1].includes('url')) {
        ogTags[`og:${match[1]}`] = makeUrlAbsolute(url, value);
      } else {
        ogTags[`og:${match[1]}`] = value;
      }
    }
    metadata.ogTags = ogTags;

    // Extract and process meta tags
    const metaTags: Record<string, string> = {};
    const metaMatches = html.matchAll(/<meta\s+name=["']([^"']+)["']\s+content=["']([^"']+)["']/gi);
    for (const match of metaMatches) {
      const value = match[2];
      if (match[1].includes('image') || match[1].includes('url')) {
        metaTags[match[1]] = makeUrlAbsolute(url, value);
      } else {
        metaTags[match[1]] = value;
      }
    }
    metadata.metaTags = metaTags;

    return metadata;
  } catch (error) {
    console.error('HTML metadata fetch error:', error);
    return null;
  }
}

function decodeHtmlEntities(str: string): string {
  return str.replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#039;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&#x27;/g, "'")
            .replace(/&nbsp;/g, ' ');
}

function extractMetaContent(html: string, name: string): string {
  const titleMatch = html.match(new RegExp(`<title[^>]*>(.*?)</title>`))
  if (name === 'title' && titleMatch) {
    return decodeHtmlEntities(titleMatch[1].trim());
  }

  const ogMatch = html.match(new RegExp(`<meta\\s+(?:property|name)=["'](?:og:)?${name}["']\\s+content=["']([^"']+)["']`, 'i'))
  const nameMatch = html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, 'i'))
  
  const content = ogMatch?.[1] || nameMatch?.[1] || '';
  return decodeHtmlEntities(content.trim());
}

function extractOgTags(html: string): Record<string, string> {
  const ogTags: Record<string, string> = {}
  const matches = html.matchAll(/<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/gi)
  
  for (const match of matches) {
    ogTags[`og:${match[1]}`] = match[2]
  }
  
  return ogTags
}

function extractMetaTags(html: string): Record<string, string> {
  const metaTags: Record<string, string> = {}
  const matches = html.matchAll(/<meta\s+name=["']([^"']+)["']\s+content=["']([^"']+)["']/gi)
  
  for (const match of matches) {
    metaTags[match[1]] = match[2]
  }
  
  return metaTags
}

function getOEmbedUrl(url: string): string | null {
  const oEmbedProviders = [
    {
      regex: /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,
      endpoint: 'https://www.youtube.com/oembed',
      params: { format: 'json' }
    },
    {
      regex: /https?:\/\/(www\.)?vimeo\.com\/(\d+)/,
      endpoint: 'https://vimeo.com/api/oembed.json'
    },
    {
      regex: /https?:\/\/(www\.)?twitter\.com\/\w+\/status\/\d+/,
      endpoint: 'https://publish.twitter.com/oembed'
    },
    {
      regex: /https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[^\/]+/,
      endpoint: 'https://api.instagram.com/oembed'
    }
  ]

  for (const provider of oEmbedProviders) {
    if (provider.regex.test(url)) {
      const baseUrl = `${provider.endpoint}?url=${encodeURIComponent(url)}`
      const params = provider.params ? new URLSearchParams(provider.params).toString() : ''
      return params ? `${baseUrl}&${params}` : baseUrl
    }
  }
  return null
}
