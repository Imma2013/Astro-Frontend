import fs from 'node:fs';
import path from 'node:path';
import pkg from 'fast-glob';

const { globSync } = pkg;

/**
 * This script transforms the Remix codebase into a static SPA.
 * It converts all 'loader' and 'action' functions into 'clientLoader' and 'clientAction'.
 * This is necessary because Tauri builds require a static index.html, which Remix only
 * generates in SPA mode, but SPA mode forbids server-side exports.
 */

const routesDir = path.resolve('app/routes').replace(/\\/g, '/');
const files = globSync(`${routesDir}/**/*.{ts,tsx}`);

console.log(`Transforming ${files.length} routes for SPA build...`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Stub out most api routes, EXCEPT essential LLM ones
  const isEssentialApi = ['api.chat.ts', 'api.models.ts', 'api.models.$provider.ts'].includes(path.basename(file));

  if (path.basename(file).startsWith('api.') && !isEssentialApi) {
      console.log(`  Stubbing API route: ${path.basename(file)}`);
      content = `
import { json } from '@remix-run/react';

export const clientLoader = () => {
  return json({ error: 'This API is not available in the local-only desktop app.' }, { status: 501 });
};

export const clientAction = () => {
  return json({ error: 'This API is not available in the local-only desktop app.' }, { status: 501 });
};
`;
      fs.writeFileSync(file, content);
      return;
  }

  // Replace .server imports with server-impl to allow client-side execution in SPA
  if (content.includes('~/lib/.server/')) {
    content = content.replace(/~\/lib\/\.server\//g, '~/lib/server-impl/');
    changed = true;
  }

  // Replace export { loader, ... } or export { loader as ... } from '...'
  if (content.match(/export\s+\{.*?\bloader\b.*?\}\s+from/)) {
    content = content.replace(/\bloader\b/g, 'clientLoader');
    changed = true;
  }
  
  if (content.match(/export\s+\{.*?\baction\b.*?\}\s+from/)) {
    content = content.replace(/\baction\b/g, 'clientAction');
    changed = true;
  }

  // Handle export { loader }; (re-export from local)
  if (content.match(/export\s+\{.*?\bloader\b.*?\}[\s;]*/m)) {
    content = content.replace(/\bloader\b/g, 'clientLoader');
    changed = true;
  }
  
  if (content.match(/export\s+\{.*?\baction\b.*?\}[\s;]*/m)) {
    content = content.replace(/\baction\b/g, 'clientAction');
    changed = true;
  }

  // Replace export async function loader
  if (content.match(/export\s+(async\s+)?function\s+loader\b/)) {
    content = content.replace(/export\s+(async\s+)?function\s+loader\b/g, 'export $1function clientLoader');
    changed = true;
  }

  // Replace export const loader
  if (content.match(/export\s+const\s+loader\b/)) {
    content = content.replace(/export\s+const\s+loader\b/g, 'export const clientLoader');
    changed = true;
  }

  // Replace export async function action
  if (content.match(/export\s+(async\s+)?function\s+action\b/)) {
    content = content.replace(/export\s+(async\s+)?function\s+action\b/g, 'export $1function clientAction');
    changed = true;
  }

  // Replace export const action
  if (content.match(/export\s+const\s+action\b/)) {
    content = content.replace(/export\s+const\s+action\b/g, 'export const clientAction');
    changed = true;
  }

  // Replace LoaderFunctionArgs imports
  if (content.includes('LoaderFunctionArgs')) {
    content = content.replace(/LoaderFunctionArgs/g, 'ClientLoaderFunctionArgs');
    changed = true;
  }

  // Replace ActionFunctionArgs imports
  if (content.includes('ActionFunctionArgs')) {
    content = content.replace(/ActionFunctionArgs/g, 'ClientActionFunctionArgs');
    changed = true;
  }

  // Replace @remix-run/cloudflare with @remix-run/react for types if needed
  if (changed && content.includes('@remix-run/cloudflare')) {
    content = content.replace(/from '@remix-run\/cloudflare'/g, "from '@remix-run/react'");
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});

console.log('SPA transformation complete.');
