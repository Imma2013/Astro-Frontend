export const OPENROUTER_ALLOWED_MODELS = [
  'anthropic/claude-opus-4.6',
  'anthropic/claude-sonnet-4.5',
  'google/gemini-3.1-pro-preview',
  'google/gemini-3-pro-preview',
  'google/gemini-3-flash-preview',
] as const;

export const OPENROUTER_ALLOWED_MODEL_LABELS: Record<(typeof OPENROUTER_ALLOWED_MODELS)[number], string> = {
  'anthropic/claude-opus-4.6': 'Claude Opus 4.6',
  'anthropic/claude-sonnet-4.5': 'Claude Sonnet 4.5',
  'google/gemini-3.1-pro-preview': 'Gemini 3.1 Pro (Preview)',
  'google/gemini-3-pro-preview': 'Gemini 3.0 Pro (Preview)',
  'google/gemini-3-flash-preview': 'Gemini 3.0 Flash (Preview)',
};

export const DEFAULT_OPENROUTER_APP_RPM_LIMIT = 20;

export function isOpenRouterAllowedModel(model: string): boolean {
  return OPENROUTER_ALLOWED_MODELS.includes(model as (typeof OPENROUTER_ALLOWED_MODELS)[number]);
}
