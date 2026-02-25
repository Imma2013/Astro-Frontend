import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'fast-glob';

/**
 * This script transforms the Remix codebase into a static SPA.
 * It converts all 'loader' and 'action' functions into 'clientLoader' and 'clientAction'.
 * This is necessary because Tauri builds require a static index.html, which Remix only
 * generates in SPA mode, but SPA mode forbids server-side exports.
 */

const routesDir = path.resolve('app/routes');
const files = globSync(`${routesDir}/**/*.{ts,tsx}`);

console.log(`Transforming ${files.length} routes for SPA build...`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Skip files that already have clientLoader/clientAction unless we are doing a clean pass
  
  // Replace export async function loader
  if (content.match(/export (async )?function loader/)) {
    content = content.replace(/export (async )?function loader/g, 'export $1function clientLoader');
    changed = true;
  }

  // Replace export const loader
  if (content.match(/export const loader/)) {
    content = content.replace(/export const loader/g, 'export const clientLoader');
    changed = true;
  }

  // Replace export async function action
  if (content.match(/export (async )?function action/)) {
    content = content.replace(/export (async )?function action/g, 'export $1function clientAction');
    changed = true;
  }

  // Replace export const action
  if (content.match(/export const action/)) {
    content = content.replace(/export const action/g, 'export const clientAction');
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
