import {
  DEFAULT_OPENROUTER_APP_RPM_LIMIT,
  OPENROUTER_ALLOWED_MODELS,
  isOpenRouterAllowedModel,
} from '~/lib/openrouter/policy';

class OpenRouterSelectionError extends Error {
  statusCode: number;
  isRetryable: boolean;
  provider: string;

  constructor(message: string, statusCode: number, isRetryable: boolean) {
    super(message);
    this.name = 'OpenRouterSelectionError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.provider = 'OpenRouter';
  }
}

const openRouterRateWindow = new Map<string, { windowStart: number; count: number }>();

function getOpenRouterApiKey(apiKeys?: Record<string, string>, env?: Record<string, string>) {
  return apiKeys?.OpenRouter || env?.OPEN_ROUTER_API_KEY || '';
}

export function enforceOpenRouterModelAllowlist(provider: string, model: string) {
  if (provider !== 'OpenRouter') {
    return;
  }

  if (isOpenRouterAllowedModel(model)) {
    return;
  }

  throw new OpenRouterSelectionError(
    `Model "${model}" is blocked for OpenRouter. Allowed models: ${OPENROUTER_ALLOWED_MODELS.join(', ')}`,
    400,
    false,
  );
}

export function enforceOpenRouterRateLimit(options: {
  provider: string;
  apiKeys?: Record<string, string>;
  env?: Record<string, string>;
}) {
  const { provider, apiKeys, env } = options;

  if (provider !== 'OpenRouter') {
    return;
  }

  const apiKey = getOpenRouterApiKey(apiKeys, env);

  if (!apiKey) {
    return;
  }

  const now = Date.now();
  const windowMs = 60_000;
  const rawLimit = Number(env?.ASTRO_OPENROUTER_RPM_LIMIT || DEFAULT_OPENROUTER_APP_RPM_LIMIT);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : DEFAULT_OPENROUTER_APP_RPM_LIMIT;
  const key = apiKey.slice(-16);
  const current = openRouterRateWindow.get(key);

  if (!current || now - current.windowStart >= windowMs) {
    openRouterRateWindow.set(key, { windowStart: now, count: 1 });
    return;
  }

  if (current.count >= limit) {
    throw new OpenRouterSelectionError(
      `Astro OpenRouter guardrail hit (${limit} requests/minute). Wait a minute and retry.`,
      429,
      true,
    );
  }

  current.count += 1;
  openRouterRateWindow.set(key, current);
}
