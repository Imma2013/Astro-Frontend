type LocalRole = 'system' | 'user' | 'assistant';

type LocalMessage = {
  role: LocalRole;
  content: any;
};

type WebLLMModule = {
  prebuiltAppConfig?: {
    model_list?: Array<{ model_id?: string; vram_required_MB?: number }>;
  };
  CreateMLCEngine: (
    model: string,
    options?: {
      initProgressCallback?: (report: { progress?: number; text?: string }) => void;
    },
  ) => Promise<any>;
};

const MODEL_TAG_REGEX = /^\[Model: .*?\]\n\n/;
const PROVIDER_TAG_REGEX = /^\[Provider: .*?\]\n\n/;
const WEBLLM_IMPORT_URLS = [
  'https://esm.run/@mlc-ai/web-llm@0.2.80',
  'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.80/+esm',
] as const;
const KNOWN_MODEL_SIZES_MB: Record<string, number> = {
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': 705,
  'Llama-3.2-3B-Instruct-q4f16_1-MLC': 1820,
  'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC': 2100,
  'Phi-3.5-mini-instruct-q4f16_1-MLC': 2150,
  'Phi-3.5-vision-instruct-q3f16_1-MLC': 2340,
  'Phi-3.5-vision-instruct-q4f16_1-MLC': 2770,
  'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC': 4300,
};

let cachedModule: WebLLMModule | null = null;
let currentModel = '';
let currentEngine: any = null;

function stripProviderTags(input: string): string {
  return input.replace(MODEL_TAG_REGEX, '').replace(PROVIDER_TAG_REGEX, '');
}

async function loadWebLLMModule(): Promise<WebLLMModule> {
  if (cachedModule) {
    return cachedModule;
  }

  let lastError: unknown;

  for (const source of WEBLLM_IMPORT_URLS) {
    try {
      // Vite needs the ignore hint for runtime URL imports.
      cachedModule = (await import(/* @vite-ignore */ source)) as WebLLMModule;
      return cachedModule;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Unable to load WebLLM runtime. ${lastError instanceof Error ? lastError.message : ''}`.trim());
}

async function ensureEngine(model: string, onProgress?: (text: string) => void) {
  const mod = await loadWebLLMModule();

  if (!mod?.CreateMLCEngine) {
    throw new Error('WebLLM module failed to load');
  }

  const availableModels =
    mod.prebuiltAppConfig?.model_list?.map((entry) => entry.model_id).filter((entry): entry is string => !!entry) || [];

  if (!availableModels.includes(model)) {
    const fallback = availableModels[0];

    if (!fallback) {
      throw new Error('No WebLLM models available for this browser/runtime');
    }

    model = fallback;
  }

  if (currentEngine && currentModel === model) {
    return { engine: currentEngine, model };
  }

  onProgress?.(`Loading local model: ${model}`);
  currentEngine = await mod.CreateMLCEngine(model, {
    initProgressCallback: (report) => {
      if (!onProgress) {
        return;
      }

      const pct = typeof report.progress === 'number' ? ` (${Math.round(report.progress * 100)}%)` : '';
      onProgress(`${report.text || 'Initializing WebLLM'}${pct}`);
    },
  });
  currentModel = model;

  return { engine: currentEngine, model };
}

export async function predownloadWebLLMModel(options: {
  model: string;
  onProgress?: (text: string) => void;
}): Promise<{ resolvedModel: string }> {
  const { model, onProgress } = options;
  const result = await ensureEngine(model, onProgress);
  return { resolvedModel: result.model };
}

export async function getWebLLMModelCatalog(): Promise<
  Array<{ modelId: string; vramRequiredMB?: number; estimatedDownloadMB?: number }>
> {
  const mod = await loadWebLLMModule();
  const list = mod.prebuiltAppConfig?.model_list || [];
  return list
    .map((entry) => ({
      modelId: entry.model_id || '',
      vramRequiredMB: entry.vram_required_MB,
      estimatedDownloadMB: entry.model_id ? KNOWN_MODEL_SIZES_MB[entry.model_id] : undefined,
    }))
    .filter((entry) => !!entry.modelId);
}

export async function getBrowserStorageEstimate(): Promise<{ quotaMB?: number; usageMB?: number }> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return {};
  }

  const result = await navigator.storage.estimate();
  const quotaMB = typeof result.quota === 'number' ? Math.round(result.quota / (1024 * 1024)) : undefined;
  const usageMB = typeof result.usage === 'number' ? Math.round(result.usage / (1024 * 1024)) : undefined;
  return { quotaMB, usageMB };
}

export async function generateLocalWebLLMReply(options: {
  model: string;
  chatMode?: 'discuss' | 'build';
  history: LocalMessage[];
  userMessage: string;
  imageDataList?: string[];
  onProgress?: (text: string) => void;
}): Promise<{ text: string; resolvedModel: string }> {
  const { model, chatMode, history, userMessage, imageDataList, onProgress } = options;
  const { engine, model: resolvedModel } = await ensureEngine(model, onProgress);

  const systemMessage: LocalMessage = {
    role: 'system',
    content:
      chatMode === 'discuss'
        ? [
            'You are Astro local assistant.',
            'Keep answers concise and practical.',
            'Prioritize the latest user request over older chat context.',
            'If topic changed, do not continue old topic unless user explicitly asks.',
          ].join(' ')
        : [
            'You are Astro local builder assistant.',
            'Focus on concrete code/build steps.',
            'Strictly follow the latest user request.',
            'Do not carry over prior project topics unless explicitly requested by the user.',
          ].join(' '),
  };

  const clippedHistory = history.slice(-4).map((entry) => ({
    role: entry.role,
    content: stripProviderTags(entry.content),
  }));
  const visionRequested = (imageDataList || []).length > 0;
  const userContent = visionRequested
    ? [
        ...((imageDataList || []).map((image) => ({
          type: 'image_url',
          image_url: {
            url: image,
          },
        })) || []),
        {
          type: 'text',
          text: userMessage,
        },
      ]
    : userMessage;
  const inputMessages = [systemMessage, ...clippedHistory, { role: 'user' as const, content: userContent }];

  const completionPromise = engine.chat.completions.create({
    messages: inputMessages,
    temperature: 0.15,
  });
  const timeoutMs = 120_000;
  const response = await Promise.race([
    completionPromise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error('Local generation timed out. Try a smaller model (e.g., Llama-3.2-1B/3B) or shorter prompt.'),
          ),
        timeoutMs,
      ),
    ),
  ]);
  const text = response?.choices?.[0]?.message?.content;

  if (!text || typeof text !== 'string') {
    throw new Error('WebLLM returned an empty response');
  }

  return { text, resolvedModel };
}
