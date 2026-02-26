import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'react-toastify';

type Platform = 'win' | 'mac' | 'linux';

export function LandingPage() {
  const [isDownloading, setIsDownloading] = useState<Platform | null>(null);

  const handleDownload = async (platform: Platform) => {
    setIsDownloading(platform);
    
    try {
      // Fetch the latest release from the GitHub API
      const response = await fetch('https://api.github.com/repos/Imma2013/Astro-Frontend/releases/latest');
      
      if (!response.ok) {
        throw new Error('Release not found yet. The developers might still be building it!');
      }
      
      const release = (await response.json()) as any;
      
      // Find the correct asset based on the platform
      let assetExtension = '';
      if (platform === 'win') assetExtension = '.exe';
      if (platform === 'mac') assetExtension = '.dmg';
      if (platform === 'linux') assetExtension = '.AppImage';

      const targetAsset = release.assets.find((asset: any) => asset.name.endsWith(assetExtension));
      
      if (!targetAsset) {
        throw new Error(`Could not find the ${platform.toUpperCase()} installer in the latest release.`);
      }
      
      // Trigger the direct download
      const link = document.createElement('a');
      link.href = targetAsset.browser_download_url;
      link.download = targetAsset.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Downloading Astro for ${platform.toUpperCase()}...`);
      
    } catch (error: any) {
      console.error('Download failed:', error);
      toast.error(error.message || 'Failed to start download.');
      window.open('https://github.com/Imma2013/Astro-Frontend/releases', '_blank');
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height))] w-full px-4 text-center pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl flex flex-col items-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium mb-8 border border-blue-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Astro v1.0 is now in Beta
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-Astro-elements-textPrimary mb-6">
          The Local-First AI IDE
        </h1>
        
        <p className="text-xl md:text-2xl text-Astro-elements-textSecondary mb-12 max-w-2xl font-medium leading-relaxed">
          Build ideas into production-ready apps right on your computer. 
          Zero cloud latency. Total privacy. Infinite capabilities.
        </p>

        {/* Primary Download (Windows) */}
        <div className="flex flex-col items-center gap-6 w-full">
          <button
            onClick={() => handleDownload('win')}
            disabled={isDownloading !== null}
            className="group relative flex items-center justify-center gap-3 rounded-full bg-[#168AE6] px-10 py-5 text-xl font-semibold text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-[#146EB8] hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 disabled:opacity-70"
          >
            {isDownloading === 'win' ? (
              <div className="i-svg-spinners:90-ring-with-bg text-3xl" />
            ) : (
              <div className="i-ph:windows-logo-fill text-3xl group-hover:-translate-y-0.5 transition-transform" />
            )}
            Download for Windows (x64)
          </button>

          {/* Secondary Downloads (Mac & Linux) */}
          <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-Astro-elements-textSecondary">
            <button 
              onClick={() => handleDownload('mac')}
              disabled={isDownloading !== null}
              className="flex items-center gap-2 hover:text-Astro-elements-textPrimary transition-colors disabled:opacity-50"
            >
              <div className="i-ph:apple-logo-fill text-lg" />
              Mac (Universal)
            </button>
            <span className="opacity-30">•</span>
            <button 
              onClick={() => handleDownload('linux')}
              disabled={isDownloading !== null}
              className="flex items-center gap-2 hover:text-Astro-elements-textPrimary transition-colors disabled:opacity-50"
            >
              <div className="i-ph:linux-logo-fill text-lg" />
              Linux (AppImage)
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-24 text-sm text-Astro-elements-textTertiary flex flex-col items-center gap-2"
        >
          <p>Powered by Tauri & Llama.cpp. 100% Free and Open Source.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
