import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'react-toastify';

export function LandingPage() {
  const [isDownloading, setIsDownloading] = useState<'win' | 'mac' | null>(null);

  const handleDownload = async (platform: 'win' | 'mac') => {
    setIsDownloading(platform);
    
    try {
      // Fetch the latest release from the GitHub API
      const response = await fetch('https://api.github.com/repos/Imma2013/Astro-Frontend/releases/latest');
      
      if (!response.ok) {
        throw new Error('Release not found yet. The developers might still be building it!');
      }
      
      const release = await response.json();
      
      // Find the correct asset based on the platform
      const assetExtension = platform === 'win' ? '.exe' : '.dmg';
      const targetAsset = release.assets.find((asset: any) => asset.name.endsWith(assetExtension));
      
      if (!targetAsset) {
        throw new Error(\`Could not find the \${platform === 'win' ? 'Windows' : 'Mac'} installer in the latest release.\`);
      }
      
      // Trigger the direct download
      const link = document.createElement('a');
      link.href = targetAsset.browser_download_url;
      link.download = targetAsset.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(\`Downloading Astro for \${platform === 'win' ? 'Windows' : 'Mac'}...\`);
      
    } catch (error: any) {
      console.error('Download failed:', error);
      toast.error(error.message || 'Failed to start download.');
      // Fallback to the releases page if the API fails
      window.open('https://github.com/Imma2013/Astro-Frontend/releases', '_blank');
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height))] w-full px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl flex flex-col items-center"
      >
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-Astro-elements-textPrimary mb-6">
          The Local-First AI IDE
        </h1>
        
        <p className="text-xl md:text-2xl text-Astro-elements-textSecondary mb-12 max-w-2xl font-medium">
          Build ideas into production-ready apps right on your computer. 
          Zero cloud latency. Total privacy. Infinite capabilities.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button
            onClick={() => handleDownload('win')}
            disabled={isDownloading !== null}
            className="group relative flex items-center justify-center gap-3 rounded-full bg-[#168AE6] px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-[#146EB8] hover:scale-105 disabled:opacity-70"
          >
            {isDownloading === 'win' ? (
              <div className="i-svg-spinners:90-ring-with-bg text-2xl" />
            ) : (
              <div className="i-ph:windows-logo-fill text-2xl" />
            )}
            Download for Windows
          </button>
          
          <button
            onClick={() => handleDownload('mac')}
            disabled={isDownloading !== null}
            className="group relative flex items-center justify-center gap-3 rounded-full bg-Astro-elements-bg-depth-3 px-8 py-4 text-lg font-semibold text-Astro-elements-textPrimary shadow-sm transition-all hover:bg-Astro-elements-bg-depth-4 hover:scale-105 border border-Astro-elements-borderColor disabled:opacity-70"
          >
            {isDownloading === 'mac' ? (
              <div className="i-svg-spinners:90-ring-with-bg text-2xl" />
            ) : (
              <div className="i-ph:apple-logo-fill text-2xl" />
            )}
            Download for Mac
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-20 text-sm text-Astro-elements-textTertiary"
        >
          <p>Powered by Tauri & Llama.cpp. 100% Free and Open Source.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
