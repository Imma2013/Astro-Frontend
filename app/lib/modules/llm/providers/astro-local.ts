import { BaseProvider, getOpenAILikeModel } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';

export default class AstroLocalProvider extends BaseProvider {
  name = 'AstroLocal';
  getApiKeyLink = undefined;
  labelForGetApiKey = undefined;
  icon = 'i-ph:cpu';

  config = {};

  staticModels: ModelInfo[] = [
    {
      name: 'Qwen2.5-Coder-32B-Instruct-q4_k_m',
      label: 'Qwen2.5 Coder 32B (God Mode)',
      provider: 'AstroLocal',
      maxTokenAllowed: 32768,
    },
    {
      name: 'Codestral-22B-v0.1-q4_K_M',
      label: 'Codestral 22B (Pro)',
      provider: 'AstroLocal',
      maxTokenAllowed: 32768,
    },
    {
      name: 'Qwen2.5-Coder-7B-Instruct-q4_k_m',
      label: 'Qwen2.5 Coder 7B (Starter)',
      provider: 'AstroLocal',
      maxTokenAllowed: 32768,
    },
    {
      name: 'Qwen2.5-Coder-3B-Instruct-q4_k_m',
      label: 'Qwen2.5 Coder 3B (Eco)',
      provider: 'AstroLocal',
      maxTokenAllowed: 32768,
    },
    {
      name: 'DeepSeek-Coder-V2-Lite-Instruct-q4_K_M',
      label: 'DeepSeek Coder V2 Lite',
      provider: 'AstroLocal',
      maxTokenAllowed: 32768,
    },
  ];

  async getDynamicModels(
    _apiKeys?: Record<string, string>,
    _settings?: IProviderSetting,
    _serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    return [];
  }

  getModelInstance(options: {
    model: string;
    serverEnv?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model } = options;

    /*
     * In Tauri, our native sidecar runs on port 8081 by default.
     * It exposes an OpenAI-compatible API.
     */
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

    if (isTauri) {
      return getOpenAILikeModel('http://127.0.0.1:8081/v1', 'sk-no-key-required', model);
    }

    throw new Error('AstroLocal native engine is only available in the desktop application.');
  }
}
