import { useState, useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { IconButton } from '~/components/ui/IconButton';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { astroSettingsStore } from '~/lib/stores/astro';

interface WebSearchProps {
  onSearchResult: (result: string) => void;
  disabled?: boolean;
}

type SearchMode = 'query' | 'url';

interface WebSearchData {
  title: string;
  description: string;
  content: string;
  sourceUrl?: string;
  sources?: Array<{ title?: string; url: string }>;
}

interface WebSearchResponse {
  success: boolean;
  data?: WebSearchData;
  error?: string;
}

function formatSearchResult(data: WebSearchData, mode: SearchMode): string {
  const heading = mode === 'query' ? '[Web search context]' : `[Web content from ${data.sourceUrl}]`;
  const parts: string[] = [heading];

  if (data.title) {
    parts.push(`Title: ${data.title}`);
  }

  if (data.description) {
    parts.push(`Description: ${data.description}`);
  }

  if (data.sources?.length) {
    const sourceLines = data.sources.slice(0, 8).map((source, index) => `${index + 1}. ${source.title || source.url} - ${source.url}`);
    parts.push('Sources:', ...sourceLines);
  }

  parts.push('', data.content);

  return parts.join('\n');
}

export function WebSearch({ onSearchResult, disabled = false }: WebSearchProps) {
  const astroSettings = useStore(astroSettingsStore);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mode, setMode] = useState<SearchMode>('query');
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    const trimmedUrl = url.trim();

    if ((mode === 'query' && !trimmedQuery) || (mode === 'url' && !trimmedUrl)) {
      return;
    }

    setIsSearching(true);

    try {
      const searchProvider = astroSettings.deploymentMode === 'local-only' ? 'searxng' : astroSettings.webSearchProvider;
      const searchEndpoint =
        astroSettings.deploymentMode === 'local-only' ? 'http://localhost:8080' : astroSettings.webSearchEndpoint;
      const searchApiKey = astroSettings.deploymentMode === 'local-only' ? '' : astroSettings.webSearchApiKey;

      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          query: trimmedQuery,
          url: trimmedUrl,
          provider: searchProvider,
          endpoint: searchEndpoint,
          apiKey: searchApiKey,
          deploymentMode: astroSettings.deploymentMode,
        }),
      });

      const result = (await response.json()) as WebSearchResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch web context');
      }

      onSearchResult(formatSearchResult(result.data, mode));
      toast.success(mode === 'query' ? 'Web results added to prompt' : 'URL content fetched');
      setQuery('');
      setUrl('');
      setIsOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch web context');
    } finally {
      setIsSearching(false);
    }
  };

  const inputValue = mode === 'query' ? query : url;

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        title="Search the Web"
        disabled={disabled || isSearching}
        onClick={() => setIsOpen(!isOpen)}
        className="transition-all"
      >
        {isSearching ? (
          <div className="i-svg-spinners:90-ring-with-bg text-Astro-elements-loader-progress text-xl animate-spin" />
        ) : (
          <div className="i-ph:globe-hemisphere-west text-xl" />
        )}
      </IconButton>
      {isOpen && (
        <div
          className={classNames(
            'absolute bottom-full left-0 mb-2 w-[360px] space-y-2',
            'rounded-lg border border-Astro-elements-borderColor bg-Astro-elements-background-depth-2 p-2 shadow-lg',
          )}
        >
          <div className="flex gap-1 rounded-md border border-Astro-elements-borderColor p-1 bg-Astro-elements-background-depth-1">
            <button
              onClick={() => setMode('query')}
              className={classNames(
                'flex-1 rounded px-2 py-1 text-xs',
                mode === 'query'
                  ? 'bg-Astro-elements-button-primary-background text-Astro-elements-button-primary-text'
                  : 'text-Astro-elements-textSecondary hover:bg-Astro-elements-item-backgroundActive',
              )}
            >
              Search Query
            </button>
            <button
              onClick={() => setMode('url')}
              className={classNames(
                'flex-1 rounded px-2 py-1 text-xs',
                mode === 'url'
                  ? 'bg-Astro-elements-button-primary-background text-Astro-elements-button-primary-text'
                  : 'text-Astro-elements-textSecondary hover:bg-Astro-elements-item-backgroundActive',
              )}
            >
              Fetch URL
            </button>
          </div>
          <div className="text-[11px] text-Astro-elements-textTertiary px-1">
            Mode:{' '}
            {astroSettings.deploymentMode === 'local-only' ? 'Private Local Search' : `Cloud (${astroSettings.webSearchProvider})`}
          </div>
          <input
            ref={inputRef}
            type={mode === 'query' ? 'text' : 'url'}
            value={inputValue}
            onChange={(e) => {
              if (mode === 'query') {
                setQuery(e.target.value);
              } else {
                setUrl(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSearching) {
                handleSearch();
              }

              if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder={mode === 'query' ? 'best indexeddb alternatives for browser apps' : 'https://example.com'}
            disabled={isSearching}
            className={classNames(
              'w-full px-3 py-2 text-sm rounded-md',
              'border border-Astro-elements-borderColor',
              'bg-Astro-elements-background-depth-1 text-Astro-elements-textPrimary',
              'placeholder-Astro-elements-textTertiary',
              'focus:outline-none focus:ring-2 focus:ring-Astro-elements-focus',
            )}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !inputValue.trim()}
            className={classNames(
              'w-full px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap',
              'bg-Astro-elements-button-primary-background text-Astro-elements-button-primary-text',
              'hover:bg-Astro-elements-button-primary-backgroundHover',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isSearching ? 'Searching...' : mode === 'query' ? 'Search the Web' : 'Fetch URL'}
          </button>
        </div>
      )}
    </div>
  );
}
