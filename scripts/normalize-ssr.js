import fs from 'node:fs';
import path from 'node:path';
import pkg from 'fast-glob';

const { globSync } = pkg;

const routesDir = path.resolve('app/routes').replace(/\\/g, '/');
const files = globSync(`${routesDir}/**/*.{ts,tsx}`);

console.log(`♻️  Restoring SSR signatures for ${files.length} routes...`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.match(/\bexport\s+(const|async\s+function|function)\s+clientLoader\b/)) {
      content = content.replace(/\bexport\s+(const|async\s+function|function)\s+clientLoader\b/g, 'export $1 loader');
      changed = true;
  }

  if (content.match(/\bexport\s+(const|async\s+function|function)\s+clientAction\b/)) {
      content = content.replace(/\bexport\s+(const|async\s+function|function)\s+clientAction\b/g, 'export $1 action');
      changed = true;
  }

  if (content.includes('ClientLoaderFunctionArgs')) {
      content = content.replace(/\bClientLoaderFunctionArgs\b/g, 'LoaderFunctionArgs');
      changed = true;
  }
  if (content.includes('ClientActionFunctionArgs')) {
      content = content.replace(/\bClientActionFunctionArgs\b/g, 'ActionFunctionArgs');
      changed = true;
  }

  if (content.includes("from '@remix-run/react'") && (content.includes('LoaderFunctionArgs') || content.includes('ActionFunctionArgs'))) {
      content = content.replace(/from '@remix-run\/react'/g, "from '@remix-run/cloudflare'");
      changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});

console.log('✅ SSR normalization complete.');
