import { motion } from 'framer-motion';

export function LandingPage() {
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
          <a
            href="https://github.com/Imma2013/Astro-Frontend/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center gap-3 rounded-full bg-[#168AE6] px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-[#146EB8] hover:scale-105"
          >
            <div className="i-ph:windows-logo-fill text-2xl" />
            Download for Windows
          </a>
          
          <a
            href="https://github.com/Imma2013/Astro-Frontend/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center gap-3 rounded-full bg-Astro-elements-bg-depth-3 px-8 py-4 text-lg font-semibold text-Astro-elements-textPrimary shadow-sm transition-all hover:bg-Astro-elements-bg-depth-4 hover:scale-105 border border-Astro-elements-borderColor"
          >
            <div className="i-ph:apple-logo-fill text-2xl" />
            Download for Mac
          </a>
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
