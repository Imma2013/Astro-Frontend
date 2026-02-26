import { json } from '@remix-run/cloudflare';
import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { isAllowedUrl } from '~/utils/url';
import type { AstroDeploymentMode, AstroWebSearchProvider } from '~/types/astro';

const MAX_CONTENT_LENGTH = 8000;
const MAX_RESULTS = 6;

const PUBLIC_SEARXNG_INSTANCES = [
  'https://searx.be',
  'https://search.ononoki.org',
  'https://searx.work',
  'https://baresearch.org',
];

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

interface UrlSearchRequest {
  mode?: 'url' | 'query';
  url?: string;
  query?: string;
  provider?: AstroWebSearchProvider;
  endpoint?: string;
  apiKey?: string;
  deploymentMode?: AstroDeploymentMode;
}

interface UnifiedSearchResult {
  title?: string;
  snippet?: string;
  url: string;
}

function trimContent(value: string): string {
  return value.length > MAX_CONTENT_LENGTH ? `${value.slice(0, MAX_CONTENT_LENGTH)}...` : value;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);

  if (match) {
    return match[1].trim();
  }

  const altMatch = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);

  return altMatch ? altMatch[1].trim() : '';
}

function extractTextContent(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEndpoint(provider: AstroWebSearchProvider, endpoint?: string): string {
  if (endpoint?.trim()) {
    return endpoint.trim().replace(/\/$/, '');
  }

  if (provider === 'tavily') {
    return 'https://api.tavily.com';
  }

  if (provider === 'exa') {
    return 'https://api.exa.ai';
  }

  return 'http://localhost:8080';
}

function summarizeSearchResults(query: string, provider: AstroWebSearchProvider, results: UnifiedSearchResult[]) {
  const sources = results.map((result) => ({
    title: result.title,
    url: result.url,
  }));

  const lines = results
    .map((result, index) => `${index + 1}. ${result.title || result.url}\n${result.snippet || ''}\nSource: ${result.url}`)
    .join('\n\n');

  return {
    title: `Web results for: ${query}`,
    description: `Provider: ${provider}`,
    content: trimContent(lines),
    sources,
  };
}

async function searchWithSearxng(query: string, endpoint: string): Promise<UnifiedSearchResult[]> {
  const isLocal = endpoint.includes('localhost') || endpoint.includes('127.0.0.1');
  const targets = isLocal ? [endpoint, ...PUBLIC_SEARXNG_INSTANCES] : [endpoint];

  let lastError: Error | null = null;

  for (const target of targets) {
    try {
      const searchUrl = new URL(`${target}/search`);
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('format', 'json');
      searchUrl.searchParams.set('language', 'en-US');

      const response = await fetch(searchUrl.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        results?: Array<{ title?: string; content?: string; url?: string }>;
      };

      if (!data.results || data.results.length === 0) {
        continue;
      }

      return data.results
        .filter((item) => item.url)
        .slice(0, MAX_RESULTS)
        .map((item) => ({
          title: item.title,
          snippet: item.content,
          url: item.url as string,
        }));
    } catch (error: any) {
      lastError = error;
      continue;
    }
  }

  throw new Error(`Search failed after trying ${targets.length} sources. ${lastError?.message || ''}`);
}

async function searchWithTavily(query: string, endpoint: string, apiKey: string): Promise<UnifiedSearchResult[]> {
  if (!apiKey) {
    throw new Error('Tavily requires an API key. Set it in Settings > Astro Runtime.');
  }

  const response = await fetch(`${endpoint}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      max_results: MAX_RESULTS,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Tavily request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    results?: Array<{ title?: string; content?: string; url?: string }>;
  };

  return (data.results || [])
    .filter((item) => item.url)
    .slice(0, MAX_RESULTS)
    .map((item) => ({
      title: item.title,
      snippet: item.content,
      url: item.url as string,
    }));
}

async function searchWithExa(query: string, endpoint: string, apiKey: string): Promise<UnifiedSearchResult[]> {
  if (!apiKey) {
    throw new Error('Exa requires an API key. Set it in Settings > Astro Runtime.');
  }

  const response = await fetch(`${endpoint}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query,
      numResults: MAX_RESULTS,
      type: 'auto',
      contents: {
        text: true,
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Exa request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    results?: Array<{ title?: string; text?: string; url?: string }>;
  };

  return (data.results || [])
    .filter((item) => item.url)
    .slice(0, MAX_RESULTS)
    .map((item) => ({
      title: item.title,
      snippet: item.text,
      url: item.url as string,
    }));
}

async function runQuerySearch(params: { provider: AstroWebSearchProvider; query: string; endpoint: string; apiKey: string }) {
  const { provider, query, endpoint, apiKey } = params;

  if (provider === 'tavily') {
    return searchWithTavily(query, endpoint, apiKey);
  }

  if (provider === 'exa') {
    return searchWithExa(query, endpoint, apiKey);
  }

  return searchWithSearxng(query, endpoint);
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as UrlSearchRequest;
    const mode = payload.mode || 'url';

    if (mode === 'query') {
      const query = payload.query?.trim();

      if (!query) {
        return json({ error: 'Search query is required' }, { status: 400 });
      }

      const provider = payload.provider || 'searxng';
      const deploymentMode = payload.deploymentMode || 'local-only';
      const effectiveProvider = deploymentMode === 'local-only' ? 'searxng' : provider;
      const endpoint = normalizeEndpoint(effectiveProvider, payload.endpoint);
      const apiKey = deploymentMode === 'local-only' ? '' : payload.apiKey?.trim() || '';
      const results = await runQuerySearch({ provider: effectiveProvider, query, endpoint, apiKey });

      if (!results.length) {
        return json({ error: 'No web results found for this query' }, { status: 404 });
      }

      return json({
        success: true,
        data: summarizeSearchResults(query, effectiveProvider, results),
      });
    }

    const url = payload.url;

    if (!url || typeof url !== 'string') {
      return json({ error: 'URL is required' }, { status: 400 });
    }

    if (!isAllowedUrl(url)) {
      return json({ error: 'URL is not allowed. Only public HTTP/HTTPS URLs are accepted.' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return json({ error: `Failed to fetch URL: ${response.status} ${response.statusText}` }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return json({ error: 'URL must point to an HTML or text page' }, { status: 400 });
    }

    const html = await response.text();
    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const content = extractTextContent(html);

    return json({
      success: true,
      data: {
        title,
        description,
        content: trimContent(content),
        sourceUrl: url,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return json({ error: 'Request timed out after 10 seconds' }, { status: 504 });
    }

    console.error('Web search error:', error);

    return json({ error: error instanceof Error ? error.message : 'Failed to fetch web context' }, { status: 500 });
  }
}
