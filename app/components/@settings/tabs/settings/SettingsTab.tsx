import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { Switch } from '~/components/ui/Switch';
import type { UserProfile } from '~/components/@settings/core/types';
import { isMac } from '~/utils/os';
import {
  astroSettingsStore,
  setAutoScaffoldBackend,
  setBackendCustomApiUrl,
  setBackendProvider,
  setDesignDna,
  setDesignDnaSourceUrl,
  setDeploymentMode,
  setWebSearchApiKey,
  setWebSearchEndpoint,
  setWebSearchProvider,
} from '~/lib/stores/astro';

// Helper to get modifier key symbols/text
const getModifierSymbol = (modifier: string): string => {
  switch (modifier) {
    case 'meta':
      return isMac ? 'Cmd' : 'Win';
    case 'alt':
      return 'Alt';
    case 'shift':
      return 'Shift';
    default:
      return modifier;
  }
};

export default function SettingsTab() {
  const [currentTimezone, setCurrentTimezone] = useState('');
  const [designDnaImportUrl, setDesignDnaImportUrl] = useState('');
  const astroSettings = useStore(astroSettingsStore);
  const [settings, setSettings] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('Astro_user_profile');
    return saved
      ? JSON.parse(saved)
      : {
          notifications: true,
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
  });

  useEffect(() => {
    setCurrentTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    setDesignDnaImportUrl(astroSettings.designDnaSourceUrl || '');
  }, [astroSettings.designDnaSourceUrl]);

  const normalizeDesignDnaUrl = (input: string) => {
    const trimmed = input.trim();

    if (!trimmed) {
      return '';
    }

    try {
      const parsed = new URL(trimmed);

      if (parsed.hostname === 'github.com' && parsed.pathname.includes('/blob/')) {
        const rawPath = parsed.pathname.replace('/blob/', '/');
        return `https://raw.githubusercontent.com${rawPath}`;
      }

      return parsed.toString();
    } catch {
      return trimmed;
    }
  };

  const importDesignDnaFromUrl = async () => {
    const normalizedUrl = normalizeDesignDnaUrl(designDnaImportUrl);

    if (!normalizedUrl) {
      toast.error('Enter a GitHub raw URL or blob URL first.');
      return;
    }

    try {
      const response = await fetch(normalizedUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch design DNA: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      setDesignDna(text.slice(0, 30_000));
      setDesignDnaSourceUrl(normalizedUrl);
      toast.success('Design DNA imported into Astro runtime.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import design DNA.');
    }
  };

  // Save settings automatically when they change
  useEffect(() => {
    try {
      // Get existing profile data
      const existingProfile = JSON.parse(localStorage.getItem('Astro_user_profile') || '{}');

      // Merge with new settings
      const updatedProfile = {
        ...existingProfile,
        notifications: settings.notifications,
        language: settings.language,
        timezone: settings.timezone,
      };

      localStorage.setItem('Astro_user_profile', JSON.stringify(updatedProfile));
      toast.success('Settings updated');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to update settings');
    }
  }, [settings]);

  return (
    <div className="space-y-4">
      {/* Language & Notifications */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:palette-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-Astro-elements-textPrimary">Preferences</span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="i-ph:translate-fill w-4 h-4 text-Astro-elements-textSecondary" />
            <label className="block text-sm text-Astro-elements-textSecondary">Language</label>
          </div>
          <select
            value={settings.language}
            onChange={(e) => setSettings((prev) => ({ ...prev, language: e.target.value }))}
            className={classNames(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-Astro-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
            )}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
          </select>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="i-ph:bell-fill w-4 h-4 text-Astro-elements-textSecondary" />
            <label className="block text-sm text-Astro-elements-textSecondary">Notifications</label>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-Astro-elements-textSecondary">
              {settings.notifications ? 'Notifications are enabled' : 'Notifications are disabled'}
            </span>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => {
                // Update local state
                setSettings((prev) => ({ ...prev, notifications: checked }));

                // Update localStorage immediately
                const existingProfile = JSON.parse(localStorage.getItem('Astro_user_profile') || '{}');
                const updatedProfile = {
                  ...existingProfile,
                  notifications: checked,
                };
                localStorage.setItem('Astro_user_profile', JSON.stringify(updatedProfile));

                // Dispatch storage event for other components
                window.dispatchEvent(
                  new StorageEvent('storage', {
                    key: 'Astro_user_profile',
                    newValue: JSON.stringify(updatedProfile),
                  }),
                );

                toast.success(`Notifications ${checked ? 'enabled' : 'disabled'}`);
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Timezone */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:clock-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-Astro-elements-textPrimary">Time Settings</span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="i-ph:globe-fill w-4 h-4 text-Astro-elements-textSecondary" />
            <label className="block text-sm text-Astro-elements-textSecondary">Timezone</label>
          </div>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
            className={classNames(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-Astro-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
            )}
          >
            <option value={currentTimezone}>{currentTimezone}</option>
          </select>
        </div>
      </motion.div>

      {/* Astro Runtime */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:rocket-launch-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-Astro-elements-textPrimary">Astro Runtime</span>
        </div>

        <div>
          <label className="block text-sm text-Astro-elements-textSecondary mb-2">Mode</label>
          <select
            value={astroSettings.deploymentMode}
            onChange={(e) => setDeploymentMode(e.target.value as 'local-only' | 'hosted-augment')}
            className={classNames(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-Astro-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
            )}
          >
            <option value="local-only">Local-Only (privacy first)</option>
            <option value="hosted-augment">Hosted Augment (optional cloud services)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-Astro-elements-textSecondary mb-2">Backend Provider</label>
          <select
            value={astroSettings.backendProvider}
            onChange={(e) => setBackendProvider(e.target.value as 'magical-scaffold' | 'supabase' | 'custom-rest')}
            disabled={astroSettings.deploymentMode === 'local-only'}
            className={classNames(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-Astro-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200 disabled:opacity-60',
            )}
          >
            <option value="magical-scaffold">Magical Scaffold (Node.js/Express)</option>
            <option value="supabase">Supabase</option>
            <option value="custom-rest">Custom REST API</option>
          </select>
          <p className="text-xs text-Astro-elements-textTertiary mt-1">
            Default keeps backend generation local and automatic in the WebContainer.
          </p>
        </div>

        {astroSettings.backendProvider === 'custom-rest' && astroSettings.deploymentMode === 'hosted-augment' && (
          <div>
            <label className="block text-sm text-Astro-elements-textSecondary mb-2">Custom REST Base URL</label>
            <input
              type="url"
              value={astroSettings.backendCustomApiUrl}
              onChange={(e) => setBackendCustomApiUrl(e.target.value)}
              placeholder="https://api.example.com"
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'text-Astro-elements-textPrimary placeholder-Astro-elements-textTertiary',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                'transition-all duration-200',
              )}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-Astro-elements-textPrimary">Auto scaffold backend files</p>
            <p className="text-xs text-Astro-elements-textTertiary">
              Prompts the model to create backend files by default while chatting.
            </p>
          </div>
          <Switch checked={astroSettings.autoScaffoldBackend} onCheckedChange={setAutoScaffoldBackend} />
        </div>

        <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#1A1A1A] space-y-3">
          <p className="text-sm text-Astro-elements-textPrimary">Manual Web Search</p>
          <div>
            <label className="block text-sm text-Astro-elements-textSecondary mb-2">Search Provider</label>
            <select
              value={astroSettings.webSearchProvider}
              onChange={(e) => setWebSearchProvider(e.target.value as 'searxng' | 'tavily' | 'exa')}
              disabled={astroSettings.deploymentMode === 'local-only'}
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'text-Astro-elements-textPrimary',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                'transition-all duration-200 disabled:opacity-60',
              )}
            >
              <option value="searxng">SearXNG (local-first)</option>
              <option value="tavily">Tavily API</option>
              <option value="exa">Exa API</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-Astro-elements-textSecondary mb-2">Search Endpoint</label>
            <input
              type="text"
              value={astroSettings.webSearchEndpoint}
              onChange={(e) => setWebSearchEndpoint(e.target.value)}
              disabled={astroSettings.deploymentMode === 'local-only'}
              placeholder={
                astroSettings.webSearchProvider === 'searxng'
                  ? 'http://localhost:8081'
                  : astroSettings.webSearchProvider === 'tavily'
                    ? 'https://api.tavily.com'
                    : 'https://api.exa.ai'
              }
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'text-Astro-elements-textPrimary placeholder-Astro-elements-textTertiary',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                'transition-all duration-200 disabled:opacity-60',
              )}
            />
          </div>
          <div>
            <label className="block text-sm text-Astro-elements-textSecondary mb-2">Search API Key (optional)</label>
            <input
              type="password"
              value={astroSettings.webSearchApiKey}
              onChange={(e) => setWebSearchApiKey(e.target.value)}
              disabled={astroSettings.deploymentMode === 'local-only'}
              placeholder="Leave empty for local SearXNG"
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'text-Astro-elements-textPrimary placeholder-Astro-elements-textTertiary',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                'transition-all duration-200 disabled:opacity-60',
              )}
            />
          </div>
          {astroSettings.deploymentMode === 'local-only' && (
            <p className="text-xs text-Astro-elements-textTertiary">
              Local-Only mode locks search to SearXNG and avoids cloud API usage by default.
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#1A1A1A] space-y-2">
          <p className="text-sm text-Astro-elements-textPrimary">Practical Deployment Reality</p>
          <p className="text-xs text-Astro-elements-textTertiary">
            Recommended production path: Cloudflare Pages (frontend hosting) + Supabase (Auth, Postgres, Edge
            Functions). This keeps Astro local-first while adding a professional hosted backend when needed.
          </p>
          <p className="text-xs text-Astro-elements-textTertiary">
            Local-Only: Dexie/IndexedDB + OPFS, local logs, optional local search.
          </p>
          <p className="text-xs text-Astro-elements-textTertiary">
            Hosted Augment: keep core local, then add Supabase/custom API, cloud search, and remote analytics.
          </p>
          <p className="text-xs text-Astro-elements-textTertiary">
            Note: GitHub Pages remains static-only, and plan quotas/pricing can change. Verify current
            Cloudflare/Supabase limits before launch.
          </p>
          <div className="pt-2 space-y-2">
            <p className="text-sm text-Astro-elements-textPrimary">Domain Onboarding (No Payment Handling)</p>
            <p className="text-xs text-Astro-elements-textTertiary">
              Keep checkout outside Astro: send users to registrar checkout (Cloudflare Registrar), or embed a domain
              search affiliate widget and redirect for purchase.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://www.cloudflare.com/products/registrar/"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-md text-xs bg-Astro-elements-background-depth-3 hover:bg-Astro-elements-background-depth-4 text-Astro-elements-textPrimary"
              >
                Cloudflare Registrar
              </a>
              <a
                href="https://www.namecheap.com/affiliates/domain-search-widget/"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-md text-xs bg-Astro-elements-background-depth-3 hover:bg-Astro-elements-background-depth-4 text-Astro-elements-textPrimary"
              >
                Domain Search Widget
              </a>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#1A1A1A] space-y-3">
          <p className="text-sm text-Astro-elements-textPrimary">Design DNA (Claude/GitHub)</p>
          <p className="text-xs text-Astro-elements-textTertiary">
            Import reference code or paste design rules. Astro injects this into build-time AI behavior.
          </p>
          <p className="text-xs text-Astro-elements-textTertiary">
            Auto-load supported: if{' '}
            <code className="px-1 rounded bg-Astro-elements-background-depth-3">/public/design-dna.md</code> exists,
            Astro will load it automatically on chat startup.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={designDnaImportUrl}
              onChange={(e) => setDesignDnaImportUrl(e.target.value)}
              placeholder="https://github.com/.../blob/main/design-dna.md or raw URL"
              className={classNames(
                'flex-1 px-3 py-2 rounded-lg text-sm',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'text-Astro-elements-textPrimary placeholder-Astro-elements-textTertiary',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                'transition-all duration-200',
              )}
            />
            <button
              type="button"
              onClick={importDesignDnaFromUrl}
              className={classNames(
                'px-3 py-2 rounded-lg text-sm whitespace-nowrap',
                'bg-Astro-elements-button-primary-background text-Astro-elements-button-primary-text',
                'hover:bg-Astro-elements-button-primary-backgroundHover',
              )}
            >
              Import
            </button>
          </div>
          <textarea
            value={astroSettings.designDna}
            onChange={(e) => setDesignDna(e.target.value)}
            placeholder="Paste Claude-generated component code or design directives here..."
            className={classNames(
              'w-full min-h-[150px] px-3 py-2 rounded-lg text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-Astro-elements-textPrimary placeholder-Astro-elements-textTertiary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
            )}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-Astro-elements-textTertiary">
              {astroSettings.designDna.length} chars loaded
            </span>
            <button
              type="button"
              onClick={() => {
                setDesignDna('');
                setDesignDnaSourceUrl('');
                setDesignDnaImportUrl('');
              }}
              className="text-xs text-Astro-elements-textSecondary hover:text-Astro-elements-textPrimary"
            >
              Clear
            </button>
          </div>
        </div>
      </motion.div>

      {/* Simplified Keyboard Shortcuts */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:keyboard-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-Astro-elements-textPrimary">Keyboard Shortcuts</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAFA] dark:bg-[#1A1A1A]">
            <div className="flex flex-col">
              <span className="text-sm text-Astro-elements-textPrimary">Toggle Theme</span>
              <span className="text-xs text-Astro-elements-textSecondary">Switch between light and dark mode</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs font-semibold text-Astro-elements-textSecondary bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] rounded shadow-sm">
                {getModifierSymbol('meta')}
              </kbd>
              <kbd className="px-2 py-1 text-xs font-semibold text-Astro-elements-textSecondary bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] rounded shadow-sm">
                {getModifierSymbol('alt')}
              </kbd>
              <kbd className="px-2 py-1 text-xs font-semibold text-Astro-elements-textSecondary bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] rounded shadow-sm">
                {getModifierSymbol('shift')}
              </kbd>
              <kbd className="px-2 py-1 text-xs font-semibold text-Astro-elements-textSecondary bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] rounded shadow-sm">
                D
              </kbd>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
