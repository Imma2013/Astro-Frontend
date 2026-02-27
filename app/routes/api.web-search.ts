import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

const PUBLIC_SEARXNG_INSTANCES = [
  'https://searx.be',
  'https://searxng.site',
  'https://priv.au',
  'https://search.ononoki.org',
  'https://searx.work'
];

async function fetchWithTimeout(url: string, options: any, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    const { mode, query, url, provider, endpoint, apiKey } = body;

    if (mode === 'url') {
      return await handleUrlFetch(url);
    }

    if (provider === 'tavily') {
      return await handleTavilySearch(query, apiKey);
    }

    if (provider === 'exa') {
      return await handleExaSearch(query, apiKey);
    }

    // Default to SearXNG
    return await handleSearXNGSearch(query, endpoint);
  } catch (error) {
    console.error('Web Search Error:', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

async function handleUrlFetch(url: string) {
  try {
    const response = await fetchWithTimeout(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      return json({
        success: true,
        data: {
          title: data.data?.title || 'Fetched Content',
          description: data.data?.description || '',
          content: data.data?.content || 'No content found',
          sourceUrl: url
        }
      });
    }

    // Fallback to basic fetch if Jina fails
    const rawRes = await fetchWithTimeout(url, {});
    const text = await rawRes.text();
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 10000);

    return json({
      success: true,
      data: {
        title: 'Raw Page Content',
        description: '',
        content: cleanText,
        sourceUrl: url
      }
    });
  } catch (e) {
    throw new Error(`Failed to fetch URL: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

async function handleTavilySearch(query: string, apiKey: string) {
  if (!apiKey) throw new Error('Tavily API Key is required');

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5
    })
  });

  const data = await response.json();
  const results = data.results.map((r: any) => `${r.title}\n${r.url}\n${r.content}`).join('\n\n');

  return json({
    success: true,
    data: {
      title: `Search results for: ${query}`,
      description: `Found ${data.results.length} results via Tavily`,
      content: results,
      sources: data.results.map((r: any) => ({ title: r.title, url: r.url }))
    }
  });
}

async function handleExaSearch(query: string, apiKey: string) {
  if (!apiKey) throw new Error('Exa API Key is required');

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      query,
      useAutoprompt: true,
      numResults: 5,
      highlights: true
    })
  });

  const data = await response.json();
  const results = data.results.map((r: any) => `${r.title}\n${r.url}\n${r.text || r.highlights?.[0]}`).join('\n\n');

  return json({
    success: true,
    data: {
      title: `Search results for: ${query}`,
      description: `Found ${data.results.length} results via Exa AI`,
      content: results,
      sources: data.results.map((r: any) => ({ title: r.title, url: r.url }))
    }
  });
}

async function handleSearXNGSearch(query: string, customEndpoint?: string) {
  const instances = customEndpoint ? [customEndpoint, ...PUBLIC_SEARXNG_INSTANCES] : PUBLIC_SEARXNG_INSTANCES;
  
  for (const instance of instances) {
    try {
      const url = `${instance.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}&format=json`;
      const response = await fetchWithTimeout(url, {}, 5000);

      if (response.ok) {
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const results = data.results
            .slice(0, 5)
            .map((r: any) => `${r.title}\n${r.url}\n${r.content}`)
            .join('\n\n');

          return json({
            success: true,
            data: {
              title: `Search results for: ${query}`,
              description: `Found ${data.results.length} results via SearXNG (${instance})`,
              content: results,
              sources: data.results.slice(0, 5).map((r: any) => ({ title: r.title, url: r.url }))
            }
          });
        }
      }
    } catch (e) {
      console.warn(`SearXNG instance ${instance} failed, trying next...`);
      continue;
    }
  }

  throw new Error('All web search instances failed or returned no results. Please check your connection or try again later.');
}
