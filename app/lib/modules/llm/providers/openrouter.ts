import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export default class OpenRouterProvider extends BaseProvider {
  name = 'OpenRouter';
  getApiKeyLink = 'https://openrouter.ai/keys';

  config = {
    apiTokenKey: 'OPENROUTER_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'anthropic/claude-3.5-sonnet',
      label: 'Claude 3.5 Sonnet',
      provider: 'OpenRouter',
      maxTokenAllowed: 200000,
    },
    {
      name: 'google/gemini-2.0-flash-001',
      label: 'Gemini 2.0 Flash',
      provider: 'OpenRouter',
      maxTokenAllowed: 1048576,
    },
    {
      name: 'openai/gpt-4o',
      label: 'GPT-4o',
      provider: 'OpenRouter',
      maxTokenAllowed: 128000,
    },
    {
      name: 'deepseek/deepseek-chat',
      label: 'DeepSeek V3',
      provider: 'OpenRouter',
      maxTokenAllowed: 64000,
    },
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'OPENROUTER_API_KEY',
    });

    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const res = (await response.json()) as any;

      return res.data.map((m: any) => ({
        name: m.id,
        label: `${m.name} | ${m.id}`,
        provider: this.name,
        maxTokenAllowed: m.context_length || 8000,
      }));
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return [];
    }
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'OPENROUTER_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openrouter = createOpenRouter({
      apiKey,
    });

    return openrouter(model);
  }
}
