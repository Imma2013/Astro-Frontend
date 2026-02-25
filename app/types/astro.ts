export type AstroBackendProvider = 'magical-scaffold' | 'supabase' | 'custom-rest';
export type AstroWebSearchProvider = 'searxng' | 'tavily' | 'exa';
export type AstroDeploymentMode = 'local-only' | 'hosted-augment';

export interface AstroRuntimeConfig {
  deploymentMode: AstroDeploymentMode;
  backendProvider: AstroBackendProvider;
  backendCustomApiUrl?: string;
  autoScaffoldBackend: boolean;
  designDna?: string;
  designDnaSourceUrl?: string;
}

export interface AstroSettings {
  deploymentMode: AstroDeploymentMode;
  backendProvider: AstroBackendProvider;
  backendCustomApiUrl: string;
  autoScaffoldBackend: boolean;
  webSearchProvider: AstroWebSearchProvider;
  webSearchEndpoint: string;
  webSearchApiKey: string;
  designDna: string;
  designDnaSourceUrl: string;
  onboardingCompleted: boolean;
  selectedModel: string;
}
