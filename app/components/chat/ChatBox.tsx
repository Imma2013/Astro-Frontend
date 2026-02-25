import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { classNames } from '~/utils/classNames';
import { PROVIDER_LIST } from '~/utils/constants';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { APIKeyManager } from './APIKeyManager';
import { LOCAL_PROVIDERS } from '~/lib/stores/settings';
import FilePreview from './FilePreview';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { SendButton } from './SendButton.client';
import { IconButton } from '~/components/ui/IconButton';
import { toast } from 'react-toastify';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import { ExpoQrModal } from '~/components/workbench/ExpoQrModal';
import styles from './BaseChat.module.scss';
import type { ProviderInfo } from '~/types/model';
import type { DesignScheme } from '~/types/design-scheme';
import type { ElementInfo } from '~/components/workbench/Inspector';
import { McpTools } from './MCPTools';
import { WebSearch } from './WebSearch.client';
import { DEFAULT_OPENROUTER_APP_RPM_LIMIT } from '~/lib/openrouter/policy';
import {
  getBrowserStorageEstimate,
  getWebLLMModelCatalog,
  predownloadWebLLMModel,
} from '~/lib/local/webllm.client';

const MANUAL_MODEL_LOCK_KEY = 'Astro_model_manual_lock';
const MODEL_ACCESS_MODE_KEY = 'Astro_model_access_mode';
const LOCAL_PROVIDER_PREFERENCE = ['WebLLM', 'OpenAILike', 'LMStudio', 'Ollama'];
const CLOUD_PROVIDER_PREFERENCE = ['OpenRouter', 'OpenAI', 'Anthropic', 'Google'];
const WEBLLM_RECOMMENDATIONS = {
  mobile: ['Phi-3.5-mini-instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f16_1-MLC'],
  eco: ['Phi-3.5-mini-instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f16_1-MLC'],
  starter: ['Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC', 'Phi-3.5-mini-instruct-q4f16_1-MLC'],
  pro: ['Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC', 'Phi-3.5-mini-instruct-q4f16_1-MLC'],
  god: ['Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC', 'Phi-3.5-mini-instruct-q4f16_1-MLC'],
  vision: ['Phi-3.5-vision-instruct-q4f16_1-MLC', 'Phi-3.5-vision-instruct-q3f16_1-MLC'],
} as const;

interface ChatBoxProps {
  isModelSettingsCollapsed: boolean;
  setIsModelSettingsCollapsed: (collapsed: boolean) => void;
  provider: any;
  providerList: any[];
  modelList: any[];
  apiKeys: Record<string, string>;
  isModelLoading: string | undefined;
  onApiKeysChange: (providerName: string, apiKey: string) => void;
  uploadedFiles: File[];
  imageDataList: string[];
  textareaRef: React.RefObject<HTMLTextAreaElement> | undefined;
  input: string;
  handlePaste: (e: React.ClipboardEvent) => void;
  TEXTAREA_MIN_HEIGHT: number;
  TEXTAREA_MAX_HEIGHT: number;
  isStreaming: boolean;
  handleSendMessage: (event: React.UIEvent, messageInput?: string) => void;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  chatStarted: boolean;
  exportChat?: () => void;
  qrModalOpen: boolean;
  setQrModalOpen: (open: boolean) => void;
  handleFileUpload: () => void;
  setProvider?: ((provider: ProviderInfo) => void) | undefined;
  model?: string | undefined;
  setModel?: ((model: string) => void) | undefined;
  setUploadedFiles?: ((files: File[]) => void) | undefined;
  setImageDataList?: ((dataList: string[]) => void) | undefined;
  handleInputChange?: ((event: React.ChangeEvent<HTMLTextAreaElement>) => void) | undefined;
  handleStop?: (() => void) | undefined;
  enhancingPrompt?: boolean | undefined;
  enhancePrompt?: (() => void) | undefined;
  onWebSearchResult?: (result: string) => void;
  chatMode?: 'discuss' | 'build';
  setChatMode?: (mode: 'discuss' | 'build') => void;
  designScheme?: DesignScheme;
  setDesignScheme?: (scheme: DesignScheme) => void;
  selectedElement?: ElementInfo | null;
  setSelectedElement?: ((element: ElementInfo | null) => void) | undefined;
}

export const ChatBox: React.FC<ChatBoxProps> = (props) => {
  const [modelAccessMode, setModelAccessMode] = React.useState<'local' | 'cloud'>('local');
  const localProviders = React.useMemo(
    () => (props.providerList || []).filter((entry) => LOCAL_PROVIDERS.includes(entry.name)),
    [props.providerList],
  );
  const cloudProviders = React.useMemo(
    () => (props.providerList || []).filter((entry) => !LOCAL_PROVIDERS.includes(entry.name)),
    [props.providerList],
  );
  const [downloadStatus, setDownloadStatus] = React.useState<string>('');
  const [isDownloadingModel, setIsDownloadingModel] = React.useState(false);
  const [storageInfo, setStorageInfo] = React.useState<{ quotaMB?: number; usageMB?: number }>({});
  const [recommendedModel, setRecommendedModel] = React.useState<{ modelId?: string; estimatedDownloadMB?: number }>(
    {},
  );
  const pickPreferredProvider = (providers: ProviderInfo[], order: string[]) => {
    return (
      order.map((name) => providers.find((entry) => entry.name === name)).find(Boolean) ||
      providers[0]
    );
  };
  const applyProviderWithFirstModel = (nextProvider: ProviderInfo | undefined) => {
    if (!nextProvider) {
      return;
    }

    const nextModel = props.modelList.find((entry) => entry.provider === nextProvider.name)?.name;
    props.setProvider?.(nextProvider);

    if (nextModel) {
      props.setModel?.(nextModel);
    }
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedMode = localStorage.getItem(MODEL_ACCESS_MODE_KEY);
    const resolvedMode = savedMode === 'cloud' ? 'cloud' : 'local';
    setModelAccessMode(resolvedMode);
  }, []);

  React.useEffect(() => {
    if (modelAccessMode !== 'local') {
      return;
    }

    getBrowserStorageEstimate()
      .then((estimate) => setStorageInfo(estimate))
      .catch(() => setStorageInfo({}));
  }, [modelAccessMode]);

  React.useEffect(() => {
    if (modelAccessMode !== 'local' || typeof window === 'undefined') {
      return;
    }

    const rawProfile = localStorage.getItem('Astro_hardware_profile');
    const profile = rawProfile ? JSON.parse(rawProfile) : {};
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|mobile/.test(ua);
    const hasVisionNeed = (props.imageDataList || []).length > 0;
    const tier: 'mobile' | 'eco' | 'starter' | 'pro' | 'god' =
      isMobile ? 'mobile' : profile?.tier === 'god-mode' ? 'god' : profile?.tier || 'starter';
    const preferenceList = hasVisionNeed
      ? WEBLLM_RECOMMENDATIONS.vision
      : WEBLLM_RECOMMENDATIONS[tier] || WEBLLM_RECOMMENDATIONS.starter;

    getWebLLMModelCatalog()
      .then((catalog) => {
        const selected =
          preferenceList
            .map((modelId) => catalog.find((entry) => entry.modelId === modelId))
            .find(Boolean) || catalog[0];

        if (!selected) {
          setRecommendedModel({});
          return;
        }

        setRecommendedModel({
          modelId: selected.modelId,
          estimatedDownloadMB: selected.estimatedDownloadMB,
        });
      })
      .catch(() => setRecommendedModel({}));
  }, [modelAccessMode, props.imageDataList]);

  React.useEffect(() => {
    if (!props.provider) {
      return;
    }

    if (modelAccessMode === 'local' && !LOCAL_PROVIDERS.includes(props.provider.name)) {
      applyProviderWithFirstModel(pickPreferredProvider(localProviders as ProviderInfo[], LOCAL_PROVIDER_PREFERENCE));
      return;
    }

    if (modelAccessMode === 'cloud' && LOCAL_PROVIDERS.includes(props.provider.name)) {
      applyProviderWithFirstModel(pickPreferredProvider(cloudProviders as ProviderInfo[], CLOUD_PROVIDER_PREFERENCE));
    }
  }, [modelAccessMode, props.provider?.name, localProviders, cloudProviders, props.modelList]);

  const setMode = (nextMode: 'local' | 'cloud') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MODEL_ACCESS_MODE_KEY, nextMode);

      if (nextMode === 'cloud') {
        localStorage.setItem(MANUAL_MODEL_LOCK_KEY, '1');
      } else {
        localStorage.removeItem(MANUAL_MODEL_LOCK_KEY);
      }
    }

    setModelAccessMode(nextMode);
  };
  const handleDownloadLocalModel = async () => {
    if (isDownloadingModel) {
      return;
    }

    if (props.provider?.name !== 'WebLLM') {
      const webllmProvider = (localProviders as ProviderInfo[]).find((entry) => entry.name === 'WebLLM');
      const firstWebllmModel = props.modelList.find((entry) => entry.provider === 'WebLLM')?.name;

      if (!webllmProvider || !firstWebllmModel) {
        setDownloadStatus('WebLLM model list is unavailable. Refresh and try again.');
        return;
      }

      props.setProvider?.(webllmProvider);
      props.setModel?.(firstWebllmModel);
      setDownloadStatus('Switched to WebLLM. Click download once more.');
      return;
    }

    const targetModel = props.model || recommendedModel.modelId;

    if (!targetModel) {
      setDownloadStatus('No local model selected yet.');
      return;
    }

    setIsDownloadingModel(true);
    setDownloadStatus('Starting local model download...');

    try {
      const result = await predownloadWebLLMModel({
        model: targetModel,
        onProgress: (text) => setDownloadStatus(text),
      });

      if (result.resolvedModel !== props.model) {
        props.setModel?.(result.resolvedModel);
      }

      setDownloadStatus('Model ready for local use.');
      const estimate = await getBrowserStorageEstimate();
      setStorageInfo(estimate);
    } catch (error: any) {
      setDownloadStatus(
        error?.message || 'Model download failed. Check WebGPU support and try a smaller local model.',
      );
    } finally {
      setIsDownloadingModel(false);
    }
  };

  const handleDownloadRecommendedModel = async () => {
    if (!recommendedModel.modelId || isDownloadingModel || props.provider?.name !== 'WebLLM') {
      return;
    }

    if (props.model !== recommendedModel.modelId) {
      props.setModel?.(recommendedModel.modelId);
    }

    setIsDownloadingModel(true);
    setDownloadStatus(`Preparing recommended model: ${recommendedModel.modelId}`);

    try {
      await predownloadWebLLMModel({
        model: recommendedModel.modelId,
        onProgress: (text) => setDownloadStatus(text),
      });
      setDownloadStatus('Recommended model ready for local use.');
      const estimate = await getBrowserStorageEstimate();
      setStorageInfo(estimate);
    } catch (error: any) {
      setDownloadStatus(error?.message || 'Recommended model download failed.');
    } finally {
      setIsDownloadingModel(false);
    }
  };

  return (
    <div
      className={classNames(
        'relative w-full max-w-chat mx-auto z-prompt rounded-2xl border border-Astro-elements-borderColor',
        'bg-Astro-elements-background-depth-2/95 backdrop-blur-xl shadow-lg',
        'ring-1 ring-white/40 dark:ring-white/5 p-3',

        /*
         * {
         *   'sticky bottom-2': chatStarted,
         * },
         */
      )}
    >
      <svg className={classNames(styles.PromptEffectContainer)}>
        <defs>
          <linearGradient
            id="line-gradient"
            x1="20%"
            y1="0%"
            x2="-14%"
            y2="10%"
            gradientUnits="userSpaceOnUse"
            gradientTransform="rotate(-45)"
          >
            <stop offset="0%" stopColor="#b44aff" stopOpacity="0%"></stop>
            <stop offset="40%" stopColor="#b44aff" stopOpacity="80%"></stop>
            <stop offset="50%" stopColor="#b44aff" stopOpacity="80%"></stop>
            <stop offset="100%" stopColor="#b44aff" stopOpacity="0%"></stop>
          </linearGradient>
          <linearGradient id="shine-gradient">
            <stop offset="0%" stopColor="white" stopOpacity="0%"></stop>
            <stop offset="40%" stopColor="#ffffff" stopOpacity="80%"></stop>
            <stop offset="50%" stopColor="#ffffff" stopOpacity="80%"></stop>
            <stop offset="100%" stopColor="white" stopOpacity="0%"></stop>
          </linearGradient>
        </defs>
        <rect className={classNames(styles.PromptEffectLine)} pathLength="100" strokeLinecap="round"></rect>
        <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
      </svg>
      <FilePreview
        files={props.uploadedFiles}
        imageDataList={props.imageDataList}
        onRemove={(index) => {
          props.setUploadedFiles?.(props.uploadedFiles.filter((_, i) => i !== index));
          props.setImageDataList?.(props.imageDataList.filter((_, i) => i !== index));
        }}
      />
      <ClientOnly>
        {() => (
          <ScreenshotStateManager
            setUploadedFiles={props.setUploadedFiles}
            setImageDataList={props.setImageDataList}
            uploadedFiles={props.uploadedFiles}
            imageDataList={props.imageDataList}
          />
        )}
      </ClientOnly>
      {props.selectedElement && (
        <div className="flex mx-1.5 gap-2 items-center justify-between rounded-lg rounded-b-none border border-b-none border-Astro-elements-borderColor text-Astro-elements-textPrimary flex py-1 px-2.5 font-medium text-xs">
          <div className="flex gap-2 items-center lowercase">
            <code className="bg-accent-500 rounded-4px px-1.5 py-1 mr-0.5 text-white">
              {props?.selectedElement?.tagName}
            </code>
            selected for inspection
          </div>
          <button
            className="bg-transparent text-accent-500 pointer-auto"
            onClick={() => props.setSelectedElement?.(null)}
          >
            Clear
          </button>
        </div>
      )}
      <div className={classNames('relative border border-Astro-elements-borderColor/80 backdrop-blur rounded-xl')}>
        <textarea
          ref={props.textareaRef}
          className={classNames(
            'w-full pl-4 pt-4 pr-16 outline-none resize-none text-Astro-elements-textPrimary placeholder-Astro-elements-textTertiary bg-Astro-elements-background-depth-1/70 text-sm rounded-t-xl',
            'transition-all duration-200',
            'hover:border-Astro-elements-focus',
          )}
          onDragEnter={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '2px solid #1488fc';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '2px solid #1488fc';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '1px solid var(--Astro-elements-borderColor)';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '1px solid var(--Astro-elements-borderColor)';

            const files = Array.from(e.dataTransfer.files);
            files.forEach((file) => {
              if (file.type.startsWith('image/')) {
                const reader = new FileReader();

                reader.onload = (e) => {
                  const base64Image = e.target?.result as string;
                  props.setUploadedFiles?.([...props.uploadedFiles, file]);
                  props.setImageDataList?.([...props.imageDataList, base64Image]);
                };
                reader.readAsDataURL(file);
              }
            });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              if (event.shiftKey) {
                return;
              }

              event.preventDefault();

              if (props.isStreaming) {
                props.handleStop?.();
                return;
              }

              // ignore if using input method engine
              if (event.nativeEvent.isComposing) {
                return;
              }

              props.handleSendMessage?.(event);
            }
          }}
          value={props.input}
          onChange={(event) => {
            props.handleInputChange?.(event);
          }}
          onPaste={props.handlePaste}
          style={{
            minHeight: props.TEXTAREA_MIN_HEIGHT,
            maxHeight: props.TEXTAREA_MAX_HEIGHT,
          }}
          placeholder={props.chatMode === 'build' ? 'How can Astro help you today?' : 'What would you like to discuss?'}
          translate="no"
        />
        <ClientOnly>
          {() => (
            <SendButton
              show={props.input.length > 0 || props.isStreaming || props.uploadedFiles.length > 0}
              isStreaming={props.isStreaming}
              disabled={!props.providerList || props.providerList.length === 0}
              onClick={(event) => {
                if (props.isStreaming) {
                  props.handleStop?.();
                  return;
                }

                if (props.input.length > 0 || props.uploadedFiles.length > 0) {
                  props.handleSendMessage?.(event);
                }
              }}
            />
          )}
        </ClientOnly>
        <div className="flex flex-wrap items-center gap-2 text-sm p-3 pt-2 border-t border-Astro-elements-borderColor/50 bg-Astro-elements-background-depth-1/70 rounded-b-xl">
          <div className="flex flex-wrap gap-1 items-center bg-Astro-elements-background-depth-2 rounded-full px-1 py-1 border border-Astro-elements-borderColor/70">
            <McpTools />
            <IconButton title="Upload file" className="transition-all" onClick={() => props.handleFileUpload()}>
              <div className="i-ph:paperclip text-xl"></div>
            </IconButton>
            <WebSearch onSearchResult={(result) => props.onWebSearchResult?.(result)} disabled={props.isStreaming} />
            <IconButton
              title="Enhance prompt"
              disabled={props.input.length === 0 || props.enhancingPrompt}
              className={classNames('transition-all', props.enhancingPrompt ? 'opacity-100' : '')}
              onClick={() => {
                props.enhancePrompt?.();
                toast.success('Prompt enhanced!');
              }}
            >
              {props.enhancingPrompt ? (
                <div className="i-svg-spinners:90-ring-with-bg text-Astro-elements-loader-progress text-xl animate-spin"></div>
              ) : (
                <div className="i-Astro:stars text-xl"></div>
              )}
            </IconButton>

            <SpeechRecognitionButton
              isListening={props.isListening}
              onStart={props.startListening}
              onStop={props.stopListening}
              disabled={props.isStreaming}
            />
            <IconButton
              title="Discuss"
              className={classNames(
                'transition-all flex items-center gap-1.5 px-2.5',
                props.chatMode === 'discuss'
                  ? '!bg-Astro-elements-item-backgroundAccent !text-Astro-elements-item-contentAccent'
                  : 'bg-Astro-elements-item-backgroundDefault text-Astro-elements-item-contentDefault hover:bg-Astro-elements-background-depth-3',
              )}
              onClick={() => {
                props.setChatMode?.(props.chatMode === 'discuss' ? 'build' : 'discuss');
              }}
            >
              <div className="i-ph:chats text-lg" />
              <span className="text-xs font-medium">Discuss</span>
            </IconButton>
            <div className="relative">
              <ClientOnly>
                {() =>
                  !props.isModelSettingsCollapsed ? (
                    <div className="absolute right-0 bottom-12 z-50 w-[min(420px,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto rounded-xl border border-Astro-elements-borderColor bg-Astro-elements-background-depth-2/95 p-2 shadow-2xl backdrop-blur">
                      <div className="mb-2 rounded-lg border border-Astro-elements-borderColor/70 bg-Astro-elements-background-depth-1/90 p-2.5">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-Astro-elements-textSecondary">Model Mode</span>
                          <div className="inline-flex items-center gap-1 rounded-full border border-Astro-elements-borderColor bg-Astro-elements-background-depth-2 p-1">
                            <button
                              type="button"
                              onClick={() => setMode('local')}
                              className={classNames(
                                'rounded-full px-2 py-1 text-xs font-medium transition-colors',
                                modelAccessMode === 'local'
                                  ? 'bg-Astro-elements-item-backgroundAccent text-Astro-elements-item-contentAccent'
                                  : 'text-Astro-elements-textSecondary hover:bg-Astro-elements-background-depth-3',
                              )}
                            >
                              Local
                            </button>
                            <button
                              type="button"
                              onClick={() => setMode('cloud')}
                              className={classNames(
                                'rounded-full px-2 py-1 text-xs font-medium transition-colors',
                                modelAccessMode === 'cloud'
                                  ? 'bg-Astro-elements-item-backgroundAccent text-Astro-elements-item-contentAccent'
                                  : 'text-Astro-elements-textSecondary hover:bg-Astro-elements-background-depth-3',
                              )}
                            >
                              Cloud
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] leading-4 text-Astro-elements-textTertiary">
                          <div className="rounded-md border border-Astro-elements-borderColor/60 bg-Astro-elements-background-depth-2 px-2 py-1.5">
                            Local: free in-browser models (WebGPU, no API key).
                          </div>
                          <div className="rounded-md border border-Astro-elements-borderColor/60 bg-Astro-elements-background-depth-2 px-2 py-1.5">
                            Cloud: BYO OpenRouter/API key, paid usage limits apply.
                          </div>
                        </div>
                      </div>

                      {modelAccessMode === 'cloud' ? (
                        <>
                          <ModelSelector
                            key={props.provider?.name + ':' + props.modelList.length}
                            model={props.model}
                            setModel={props.setModel}
                            modelList={props.modelList}
                            provider={props.provider}
                            setProvider={props.setProvider}
                            providerList={(cloudProviders as ProviderInfo[]) || (PROVIDER_LIST as ProviderInfo[])}
                            apiKeys={props.apiKeys}
                            modelLoading={props.isModelLoading}
                          />
                          {(props.providerList || []).length > 0 &&
                            props.provider &&
                            !LOCAL_PROVIDERS.includes(props.provider.name) && (
                              <>
                                <APIKeyManager
                                  provider={props.provider}
                                  apiKey={props.apiKeys[props.provider.name] || ''}
                                  setApiKey={(key) => {
                                    props.onApiKeysChange(props.provider.name, key);
                                  }}
                                />
                                {props.provider.name === 'OpenRouter' && (
                                  <p className="px-1 pb-1 text-[11px] text-Astro-elements-textTertiary">
                                    OpenRouter guardrail: app-level cap {DEFAULT_OPENROUTER_APP_RPM_LIMIT} req/min.
                                    Provider-side limits still apply.
                                  </p>
                                )}
                              </>
                            )}
                        </>
                      ) : (
                        <>
                          <ModelSelector
                            key={props.provider?.name + ':' + props.modelList.length}
                            model={props.model}
                            setModel={props.setModel}
                            modelList={props.modelList}
                            provider={props.provider}
                            setProvider={props.setProvider}
                            providerList={(localProviders as ProviderInfo[]) || (PROVIDER_LIST as ProviderInfo[])}
                            apiKeys={props.apiKeys}
                            modelLoading={props.isModelLoading}
                          />
                          <div className="mt-2 rounded-lg border border-Astro-elements-borderColor/60 bg-Astro-elements-background-depth-1/80 p-2 text-xs text-Astro-elements-textTertiary">
                            Local mode active. Start with one small model, then add a second model only if needed.
                          </div>
                          {props.provider?.name === 'WebLLM' && (
                            <div className="mt-2 rounded-lg border border-Astro-elements-borderColor/60 bg-Astro-elements-background-depth-1/80 p-2 text-xs text-Astro-elements-textTertiary">
                              <div className="flex items-center justify-between gap-2">
                                <span>Download selected local model for browser use</span>
                                <button
                                  type="button"
                                  onClick={handleDownloadLocalModel}
                                  disabled={isDownloadingModel}
                                  className={classNames(
                                    'rounded-md border px-2 py-1 text-xs transition-colors',
                                    isDownloadingModel
                                      ? 'border-Astro-elements-borderColor text-Astro-elements-textTertiary'
                                      : 'border-Astro-elements-item-backgroundAccent text-Astro-elements-item-contentAccent hover:bg-Astro-elements-background-depth-2',
                                  )}
                                >
                                  {isDownloadingModel ? 'Downloading...' : 'Download Model'}
                                </button>
                              </div>
                              {downloadStatus && <p className="mt-2">{downloadStatus}</p>}
                              {recommendedModel.modelId && (
                                <div className="mt-2 rounded-md border border-Astro-elements-borderColor/60 bg-Astro-elements-background-depth-2 px-2 py-1.5">
                                  <p>
                                    Recommended for this device:{' '}
                                    <span className="font-medium text-Astro-elements-textSecondary">
                                      {recommendedModel.modelId}
                                    </span>
                                    {recommendedModel.estimatedDownloadMB
                                      ? ` (~${recommendedModel.estimatedDownloadMB}MB)`
                                      : ''}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={handleDownloadRecommendedModel}
                                    disabled={isDownloadingModel}
                                    className={classNames(
                                      'mt-1 rounded-md border px-2 py-1 text-xs transition-colors',
                                      isDownloadingModel
                                        ? 'border-Astro-elements-borderColor text-Astro-elements-textTertiary'
                                        : 'border-Astro-elements-item-backgroundAccent text-Astro-elements-item-contentAccent hover:bg-Astro-elements-background-depth-3',
                                    )}
                                  >
                                    {isDownloadingModel ? 'Downloading...' : 'Download Recommended'}
                                  </button>
                                </div>
                              )}
                              {(storageInfo.quotaMB || storageInfo.usageMB) && (
                                <p className="mt-1">
                                  Browser storage for this site: {storageInfo.usageMB || 0}MB used /{' '}
                                  {storageInfo.quotaMB || '?'}MB quota
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : null
                }
              </ClientOnly>
              <IconButton
                title="Model Settings"
                className={classNames('transition-all flex items-center gap-1', {
                  'bg-Astro-elements-item-backgroundAccent text-Astro-elements-item-contentAccent':
                    !props.isModelSettingsCollapsed,
                  'bg-Astro-elements-item-backgroundDefault text-Astro-elements-item-contentDefault':
                    props.isModelSettingsCollapsed,
                })}
                onClick={() => props.setIsModelSettingsCollapsed(!props.isModelSettingsCollapsed)}
                disabled={!props.providerList || props.providerList.length === 0}
              >
                <div className={`i-ph:caret-${props.isModelSettingsCollapsed ? 'up' : 'down'} text-lg`} />
                <span className="text-xs">{modelAccessMode === 'local' ? `Local - ${props.model}` : 'Cloud'}</span>
              </IconButton>
            </div>
          </div>
          {props.input.length > 3 ? (
            <div className="ml-auto text-xs text-Astro-elements-textTertiary hidden lg:block">
              Use <kbd className="kdb px-1.5 py-0.5 rounded bg-Astro-elements-background-depth-2">Shift</kbd> +{' '}
              <kbd className="kdb px-1.5 py-0.5 rounded bg-Astro-elements-background-depth-2">Return</kbd> a new line
            </div>
          ) : null}
          <ExpoQrModal open={props.qrModalOpen} onClose={() => props.setQrModalOpen(false)} />
        </div>
      </div>
    </div>
  );
};

