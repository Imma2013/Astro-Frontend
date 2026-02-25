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

  if (ram >= 32 && cores >= 12 && !gpuFallback) {
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

  if (ram >= 16 && cores >= 8) {
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

  if (ram >= 8) {
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
  const nav = navigator as NavigatorWithHardware;
  const ram = nav.deviceMemory ?? 'Unknown';
  const threads = navigator.hardwareConcurrency || 1;

  let gpuVendor = 'Unknown';
  let gpuArchitecture = 'Unknown';
  let gpuFallback = false;

  try {
    const adapter = await nav.gpu?.requestAdapter();

    if (adapter?.info) {
      gpuVendor = adapter.info.vendor || gpuVendor;
      gpuArchitecture = adapter.info.architecture || gpuArchitecture;
      gpuFallback = Boolean(adapter.info.isFallbackAdapter);
    }

    if (typeof adapter?.isFallbackAdapter === 'boolean') {
      gpuFallback = adapter.isFallbackAdapter;
    }

    if (adapter?.requestAdapterInfo) {
      const info = await adapter.requestAdapterInfo();
      gpuVendor = info?.vendor || gpuVendor;
      gpuArchitecture = info?.architecture || gpuArchitecture;
      gpuFallback = typeof info?.isFallbackAdapter === 'boolean' ? info.isFallbackAdapter : gpuFallback;
    }
  } catch (error) {
    console.warn('Astro hardware probe failed:', error);
  }

  const ramValue = typeof ram === 'number' ? ram : 4;

  const tierProfile = detectAstroTier({
    ram: ramValue,
    cores: threads,
    gpuFallback,
  });

  const profile: AstroHardwareProfile = {
    ram,
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

  console.log(
    `Astro Hardware: ${profile.ram}GB RAM, ${profile.threads} Cores, ${profile.gpuVendor} GPU, tier=${profile.tier}, recommended=${profile.recommendedModel} (${profile.recommendedModelSize}), power=${profile.recommendedModelPower}`,
  );

  return profile;
}
