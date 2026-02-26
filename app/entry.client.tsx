import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { initAstroHardware } from '~/lib/hardware/initAstroHardware';
import { initializeAstroStorage } from '~/lib/storage/astroStorage';

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);

  initAstroHardware().catch((error) => {
    console.warn('Astro hardware initialization failed:', error);
  });

  initializeAstroStorage().catch((error) => {
    console.warn('Astro storage initialization failed:', error);
  });
});
