import { map } from 'nanostores';
import type { AstroBackendProvider, AstroDeploymentMode, AstroSettings, AstroWebSearchProvider } from '~/types/astro';

const SETTINGS_KEY = 'Astro_settings';

const DEFAULT_SETTINGS: AstroSettings = {
  deploymentMode: 'local-only',
  backendProvider: 'magical-scaffold',
  backendCustomApiUrl: '',
  autoScaffoldBackend: true,
  webSearchProvider: 'searxng',
  webSearchEndpoint: 'http://localhost:8081',
  webSearchApiKey: '',
  designDna: '',
  designDnaSourceUrl: '',
  onboardingCompleted: false,
  selectedModel: '',
};

const isBrowser = typeof window !== 'undefined';

function getInitialSettings(): AstroSettings {
  if (!isBrowser) {
    return DEFAULT_SETTINGS;
  }

  try {
    const saved = localStorage.getItem(SETTINGS_KEY);

    if (!saved) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(saved) as Partial<AstroSettings>;

    const merged = {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };

    return normalizeAstroSettings(merged);
  } catch (error) {
    console.error('Failed to load Astro settings:', error);
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: AstroSettings) {
  if (!isBrowser) {
    return;
  }

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const astroSettingsStore = map<AstroSettings>(getInitialSettings());

function normalizeAstroSettings(settings: AstroSettings): AstroSettings {
  if (settings.deploymentMode === 'local-only') {
    return {
      ...settings,
      backendProvider: 'magical-scaffold',
      webSearchProvider: 'searxng',
      webSearchEndpoint: settings.webSearchEndpoint || 'http://localhost:8081',
    };
  }

  return settings;
}

export const updateAstroSettings = (patch: Partial<AstroSettings>) => {
  const next = normalizeAstroSettings({
    ...astroSettingsStore.get(),
    ...patch,
  });

  astroSettingsStore.set(next);
  persistSettings(next);
};

export const setDeploymentMode = (deploymentMode: AstroDeploymentMode) => updateAstroSettings({ deploymentMode });
export const setBackendProvider = (backendProvider: AstroBackendProvider) => updateAstroSettings({ backendProvider });
export const setAutoScaffoldBackend = (autoScaffoldBackend: boolean) => updateAstroSettings({ autoScaffoldBackend });
export const setBackendCustomApiUrl = (backendCustomApiUrl: string) => updateAstroSettings({ backendCustomApiUrl });
export const setWebSearchProvider = (webSearchProvider: AstroWebSearchProvider) =>
  updateAstroSettings({ webSearchProvider });
export const setWebSearchEndpoint = (webSearchEndpoint: string) => updateAstroSettings({ webSearchEndpoint });
export const setWebSearchApiKey = (webSearchApiKey: string) => updateAstroSettings({ webSearchApiKey });
export const setDesignDna = (designDna: string) => updateAstroSettings({ designDna });
export const setDesignDnaSourceUrl = (designDnaSourceUrl: string) => updateAstroSettings({ designDnaSourceUrl });
