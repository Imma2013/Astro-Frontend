import fs from 'node:fs';
import path from 'node:path';
import pkg from 'fast-glob';

const { globSync } = pkg;

/**
 * This script transforms the Remix codebase into a static SPA.
 * It is IDEMPOTENT - it can run multiple times without corrupting the code.
 */

const routesDir = path.resolve('app/routes').replace(/\\/g, '/');
const files = globSync(`${routesDir}/**/*.{ts,tsx}`);

console.log(`🚀 Transforming ${files.length} routes for high-performance SPA build...`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Stub out non-essential API routes
  const isEssentialApi = ['api.chat.ts', 'api.models.ts', 'api.models.$provider.ts', 'api.web-search.ts'].includes(path.basename(file));

  if (path.basename(file).startsWith('api.') && !isEssentialApi) {
      const stubContent = `
import { json } from '@remix-run/react';

export const clientLoader = () => {
  return json({ error: 'This API is not available in the local-only desktop app.' }, { status: 501 });
};

export const clientAction = () => {
  return json({ error: 'This API is not available in the local-only desktop app.' }, { status: 501 });
};
`;
      if (content.trim() !== stubContent.trim()) {
          console.log(`  - Stubbing API: ${path.basename(file)}`);
          fs.writeFileSync(file, stubContent);
      }
      return;
  }

  // 2. Normalize server-impl paths
  if (content.includes('~/lib/.server/')) {
    content = content.replace(/~\/lib\/\.server\//g, '~/lib/server-impl/');
    changed = true;
  }

  // 3. Transform standard exports (loader -> clientLoader, action -> clientAction)
  // Use word boundaries \b to prevent ClientClientActionFunctionArgs recursion
  
  // Handle 'export const loader = ...' or 'export async function loader(...'
  const transformExport = (type) => {
      const target = type === 'loader' ? 'clientLoader' : 'clientAction';
      const regex = new RegExp(`\\bexport\\s+(const|async\\s+function|function)\\s+${type}\\b`, 'g');
      if (content.match(regex)) {
          content = content.replace(regex, `export $1 ${target}`);
          changed = true;
      }
  };

  transformExport('loader');
  transformExport('action');

  // 3.5 Transform cross-route imports
  // Example: import { loader } from './api.models' -> import { clientLoader } from './api.models'
  const transformImport = (type) => {
      const target = type === 'loader' ? 'clientLoader' : 'clientAction';
      const regex = new RegExp(`\\bimport\\s+\\{([^}]*\\b)${type}(\\b[^}]*)\\}\\s+from\\s+['"](\\.\\/|\\.\\.\\/|~\\/routes\\/)`, 'g');
      if (content.match(regex)) {
          content = content.replace(regex, `import {$1${target}$2} from`);
          changed = true;
      }
  };

  transformImport('loader');
  transformImport('action');

  // 4. Transform type imports
  const transformType = (type) => {
      const target = type === 'LoaderFunctionArgs' ? 'ClientLoaderFunctionArgs' : 'ClientActionFunctionArgs';
      // Only prefix if not already prefixed
      const regex = new RegExp(`(?<!Client)\\b${type}\\b`, 'g');
      if (content.match(regex)) {
          content = content.replace(regex, target);
          changed = true;
      }
  };

  transformType('LoaderFunctionArgs');
  transformType('ActionFunctionArgs');

  // 5. Purge server-only context and imports
  if (content.includes('@remix-run/cloudflare')) {
    content = content.replace(/from '@remix-run\/cloudflare'/g, "from '@remix-run/react'");
    changed = true;
  }

  // 6. Strip 'context' parameter from clientLoaders/clientActions
  // Example: clientAction({ request, context }) -> clientAction({ request })
  // This is a common cause of ReferenceErrors in SPA mode
  const contextRegex = /(\bclientLoader\b|\bclientAction\b)\s*=\s*(async\s*)?\(\{\s*([^}]*)\bcontext\b,?\s*([^}]*)\}\)/g;
  if (content.match(contextRegex)) {
      content = content.replace(contextRegex, '$1 = $2({ $3$4 })');
      changed = true;
  }
  
  const contextFuncRegex = /export\s+(async\s+)?function\s+(\bclientLoader\b|\bclientAction\b)\s*\(\{\s*([^}]*)\bcontext\b,?\s*([^}]*)\}\)/g;
  if (content.match(contextFuncRegex)) {
      content = content.replace(contextFuncRegex, 'export $1function $2({ $3$4 })');
      changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});

console.log('✅ SPA transformation verified.');
