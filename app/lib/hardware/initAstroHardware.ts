interface AstroHardwareProfile {
  ram: number | 'Unknown';
  threads: number;
  gpuVendor: string;
  gpuArchitecture: string;
  gpuFallback: boolean;
  tier: 'god-mode' | 'pro' | 'starter' | 'eco';
  recommendedModel: string;
  recommendedModelSize: string;
  recommendedModelPower: string;
  recommendedModelHints: string[];
  secondaryModel: string;
  secondaryModelHints: string[];
  visionModel: string;
  visionModelHints: string[];
}

interface TierInput {
  ram: number;
  cores: number;
  gpuFallback: boolean;
}

interface TierResult {
  tier: 'god-mode' | 'pro' | 'starter' | 'eco';
  recommendedModel: string;
  recommendedModelSize: string;
  recommendedModelPower: string;
  recommendedModelHints: string[];
  secondaryModel: string;
  secondaryModelHints: string[];
  visionModel: string;
  visionModelHints: string[];
}

type NavigatorWithHardware = Navigator & {
  deviceMemory?: number;
  gpu?: {
    requestAdapter: () => Promise<{
      info?: { vendor?: string; architecture?: string; isFallbackAdapter?: boolean };
      isFallbackAdapter?: boolean;
      requestAdapterInfo?: () => Promise<{ vendor?: string; architecture?: string; isFallbackAdapter?: boolean }>;
    } | null>;
  };
};

export function detectAstroTier(input: TierInput): TierResult {
  const { ram, cores, gpuFallback } = input;

  // GOD-MODE: Needs at least 48GB RAM to comfortably run 32B models + OS
  if (ram >= 48000 && cores >= 12 && !gpuFallback) {
    return {
      tier: 'god-mode',
      recommendedModel: 'Qwen2.5-Coder-32B-Instruct-q4_K_M',
      recommendedModelSize: '18.2 GB',
      recommendedModelPower: 'Dominates coding benchmarks; 92% on HumanEval.',
      recommendedModelHints: ['qwen2.5-coder-32b', 'qwen2.5', 'coder', '32b'],
      secondaryModel: 'Codestral-22B-v0.1-q4_K_M',
      secondaryModelHints: ['codestral-22b', 'codestral', '22b'],
      visionModel: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
      visionModelHints: ['phi-3.5-vision', 'phi 3.5 vision', 'vision'],
    };
  }

  // PRO: 16GB-32GB RAM users get 7B-14B models
  if (ram >= 16000 && cores >= 8) {
    return {
      tier: 'pro',
      recommendedModel: 'Codestral-22B-v0.1-q4_K_M',
      recommendedModelSize: '13.4 GB',
      recommendedModelPower: 'Famed for low latency and 80+ language support.',
      recommendedModelHints: ['codestral-22b', 'codestral', '22b'],
      secondaryModel: 'Qwen2.5-Coder-7B-Instruct-q4_K_M',
      secondaryModelHints: ['qwen2.5-coder-7b', 'qwen2.5', 'coder', '7b'],
      visionModel: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
      visionModelHints: ['phi-3.5-vision', 'phi 3.5 vision', 'vision'],
    };
  }

  // STARTER: 8GB RAM users get 7B models
  if (ram >= 8000) {
    return {
      tier: 'starter',
      recommendedModel: 'Qwen2.5-Coder-7B-Instruct-q4_K_M',
      recommendedModelSize: '4.8 GB',
      recommendedModelPower: 'The best pound-for-pound model for standard laptops.',
      recommendedModelHints: ['qwen2.5-coder-7b', 'qwen2.5', 'coder', '7b'],
      secondaryModel: 'DeepSeek-Coder-V2-Lite-Instruct-q4_K_M',
      secondaryModelHints: ['deepseek-coder-v2-lite', 'deepseek', 'lite', 'moe'],
      visionModel: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
      visionModelHints: ['phi-3.5-vision', 'phi 3.5 vision', 'vision'],
    };
  }

  return {
    tier: 'eco',
    recommendedModel: 'DeepSeek-Coder-V2-Lite-Instruct-q4_K_M',
    recommendedModelSize: '2.5 GB',
    recommendedModelPower: 'Efficient MoE architecture for light hardware.',
    recommendedModelHints: ['deepseek-coder-v2-lite', 'deepseek', 'lite', 'moe'],
    secondaryModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    secondaryModelHints: ['llama-3.2-1b', 'llama 3.2 1b', '1b'],
    visionModel: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
    visionModelHints: ['phi-3.5-vision', 'phi 3.5 vision', 'vision'],
  };
}

export async function initAstroHardware(): Promise<AstroHardwareProfile> {
  let ramMB = 4000;
  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
  const isElectron = typeof window !== 'undefined' && (window as any).astroNative;

  if (isElectron) {
    try {
      const info = await (window as any).astroNative.getHardwareInfo();
      ramMB = info.total_memory_mb;
    } catch (e) {
      console.warn('Electron RAM probe failed, falling back to navigator:', e);
      const nav = navigator as NavigatorWithHardware;
      ramMB = (nav.deviceMemory || 4) * 1024;
    }
  } else if (isTauri) {
    const nav = navigator as NavigatorWithHardware;
    ramMB = (nav.deviceMemory || 4) * 1024;
  }

  const threads = navigator.hardwareConcurrency || 1;

  let gpuVendor = 'Unknown';
  let gpuArchitecture = 'Unknown';
  let gpuFallback = false;

  try {
    const nav = navigator as NavigatorWithHardware;
    const adapter = await nav.gpu?.requestAdapter();

    if (adapter?.info) {
      gpuVendor = adapter.info.vendor || gpuVendor;
      gpuArchitecture = adapter.info.architecture || gpuArchitecture;
      gpuFallback = Boolean(adapter.info.isFallbackAdapter);
    }
  } catch (error) {
    console.warn('Astro GPU probe failed:', error);
  }

  const tierProfile = detectAstroTier({
    ram: ramMB,
    cores: threads,
    gpuFallback,
  });

  const profile: AstroHardwareProfile = {
    ram: Math.round(ramMB / 1024),
    threads,
    gpuVendor,
    gpuArchitecture,
    gpuFallback,
    tier: tierProfile.tier,
    recommendedModel: tierProfile.recommendedModel,
    recommendedModelSize: tierProfile.recommendedModelSize,
    recommendedModelPower: tierProfile.recommendedModelPower,
    recommendedModelHints: tierProfile.recommendedModelHints,
    secondaryModel: tierProfile.secondaryModel,
    secondaryModelHints: tierProfile.secondaryModelHints,
    visionModel: tierProfile.visionModel,
    visionModelHints: tierProfile.visionModelHints,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('Astro_hardware_profile', JSON.stringify(profile));
  }

  return profile;
}
