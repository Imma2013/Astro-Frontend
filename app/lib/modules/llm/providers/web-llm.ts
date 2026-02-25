import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';

export default class WebLLMProvider extends BaseProvider {
  name = 'WebLLM';
  getApiKeyLink = 'https://webllm.mlc.ai/docs/';
  labelForGetApiKey = 'WebLLM Docs';

  config = {};

  staticModels: ModelInfo[] = [
    {
      name: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      label: 'Llama 3.2 1B (WebGPU, fast starter)',
      provider: 'WebLLM',
      maxTokenAllowed: 8192,
    },
    {
      name: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      label: 'Llama 3.2 3B (WebGPU)',
      provider: 'WebLLM',
      maxTokenAllowed: 8192,
    },
    {
      name: 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC',
      label: 'Qwen2.5 Coder 3B (WebGPU)',
      provider: 'WebLLM',
      maxTokenAllowed: 8192,
    },
    {
      name: 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC',
      label: 'Qwen2.5 Coder 7B (WebGPU, high quality)',
      provider: 'WebLLM',
      maxTokenAllowed: 8192,
    },
    {
      name: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
      label: 'Phi 3.5 Mini (WebGPU)',
      provider: 'WebLLM',
      maxTokenAllowed: 8192,
    },
    {
      name: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
      label: 'Phi 3.5 Vision (WebGPU)',
      provider: 'WebLLM',
      maxTokenAllowed: 8192,
    },
  ];

  async getDynamicModels(
    _apiKeys?: Record<string, string>,
    _settings?: IProviderSetting,
    _serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    return [];
  }

  getModelInstance(_options: {
    model: string;
    serverEnv?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    throw new Error('WebLLM runs in-browser and does not use server-side model instances');
  }
}
