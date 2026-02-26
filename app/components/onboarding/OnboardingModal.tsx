import { useStore } from '@nanostores/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { astroSettingsStore, updateAstroSettings } from '~/lib/stores/astro';
import { AstroLogo } from '~/components/ui/AstroLogo';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface HardwareProfile {
  tier: string;
  recommendedModel: string;
  recommendedModelSize: string;
  recommendedModelPower: string;
}

interface DownloadProgress {
  downloaded: number;
  total: number;
}

export function OnboardingModal() {
  const settings = useStore(astroSettingsStore);
  const [profile, setProfile] = useState<HardwareProfile | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('Astro_hardware_profile');

    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse hardware profile', e);
      }
    }
  }, []);

  if (settings.onboardingCompleted || !profile) {
    return null;
  }

  const handleDownloadAndStart = async () => {
    setIsDownloading(true);
    setProgress(0);

    let unlisten: (() => void) | undefined;

    try {
      // Set up the listener for progress updates from Rust
      unlisten = await listen<DownloadProgress>('download-progress', (event) => {
        const { downloaded, total } = event.payload;

        if (total > 0) {
          const percent = Math.round((downloaded / total) * 100);
          setProgress(percent);
        }
      });

      // The actual HuggingFace URLs for the models
      let downloadUrl = '';

      if (profile.recommendedModel.includes('Qwen2.5-Coder-32B')) {
        downloadUrl =
          'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF/resolve/main/qwen2.5-coder-32b-instruct-q4_k_m.gguf';
      } else if (profile.recommendedModel.includes('Codestral')) {
        downloadUrl =
          'https://huggingface.co/mistralai/Codestral-22B-v0.1-GGUF/resolve/main/codestral-22b-v0.1.Q4_K_M.gguf';
      } else if (profile.recommendedModel.includes('Qwen2.5-Coder-7B')) {
        downloadUrl =
          'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf';
      } else {
        downloadUrl =
          'https://huggingface.co/DeepSeek-Coder-V2-Lite-Instruct-GGUF/resolve/main/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf';
      }

      // Invoke the Rust command
      const filePath = await invoke<string>('download_model', {
        url: downloadUrl,
        filename: `${profile.recommendedModel}.gguf`,
      });

      console.log('Model successfully downloaded to:', filePath);

      // Start the engine
      await invoke('start_engine', { modelPath: filePath });
      console.log('Local AI engine started successfully on port 8081');

      updateAstroSettings({
        onboardingCompleted: true,
        selectedModel: profile.recommendedModel,
      });
    } catch (error) {
      console.error('Failed to download model:', error);

      // Fallback or error handling could go here
    } finally {
      setIsDownloading(false);

      if (unlisten) {
        unlisten();
      }
    }
  };

  const handleSkip = () => {
    updateAstroSettings({ onboardingCompleted: true });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-Astro-elements-bg-depth-1 p-8 shadow-2xl"
        >
          {/* Decorative Glow */}
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-blue-500/20 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-cyan-500/20 blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <AstroLogo className="scale-125 mb-6" />

            <h2 className="text-2xl font-bold tracking-tight text-Astro-elements-textPrimary mb-2">
              Welcome to Local-First AI
            </h2>
            <p className="text-Astro-elements-textSecondary mb-8 max-w-md">
              Astro has analyzed your hardware ({profile.tier.toUpperCase()}-tier) and found the perfect intelligence
              engine for your machine.
            </p>

            <div className="w-full rounded-xl border border-white/5 bg-white/5 p-6 mb-8 text-left shadow-inner backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold tracking-wider text-blue-400 uppercase">Recommended Brain</span>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
                  {profile.recommendedModelSize}
                </span>
              </div>
              <h3 className="text-xl font-bold text-Astro-elements-textPrimary mb-2">
                {profile.recommendedModel.replace('-q4_K_M', '').replace('-Instruct', '').replace('-MLC', '')}
              </h3>
              <p className="text-sm text-Astro-elements-textSecondary leading-relaxed">
                {profile.recommendedModelPower}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              {isDownloading ? (
                <div className="w-full flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-Astro-elements-textSecondary">
                    <span>Downloading Engine...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: 'linear' }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDownloadAndStart}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]"
                >
                  <div className="i-ph:download-simple-bold text-lg group-hover:-translate-y-0.5 transition-transform" />
                  Download & Start
                </button>
              )}

              {!isDownloading && (
                <button
                  onClick={handleSkip}
                  className="text-sm font-medium text-Astro-elements-textSecondary hover:text-Astro-elements-textPrimary transition-colors py-2"
                >
                  I'll set up my own API keys
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
