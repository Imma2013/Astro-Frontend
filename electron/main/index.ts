/// <reference types="vite/client" />
import { createRequestHandler } from '@remix-run/node';
import electron, { app, BrowserWindow, ipcMain, protocol, session } from 'electron';
import log from 'electron-log';
import path from 'node:path';
import * as pkg from '../../package.json';
import { setupAutoUpdater } from './utils/auto-update';
import { isDev, DEFAULT_PORT } from './utils/constants';
import { initViteServer, viteServer } from './utils/vite-server';
import { setupMenu } from './ui/menu';
import { createWindow } from './ui/window';
import { initCookies, storeCookies } from './utils/cookie';
import { loadServerBuild, serveAsset } from './utils/serve';
import { reloadOnChange } from './utils/reload';
import { spawn, ChildProcess } from 'node:child_process';
import { dialog } from 'electron';
import fs from 'node:fs/promises';
import https from 'node:https';
import os from 'node:os';

let llamaProcess: ChildProcess | null = null;

// sidecar management
ipcMain.handle('start-engine', async (_event, modelPath: string, options: any = {}) => {
  if (llamaProcess) {
    llamaProcess.kill();
  }

  const binaryName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
  // In dev, look in src-tauri/binaries (re-using current folder structure for now)
  // In prod, electron-builder puts it in resources
  const binaryPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'binaries', binaryName)
    : path.resolve(process.cwd(), 'src-tauri', 'binaries', binaryName);

  console.log(`Spawning sidecar: ${binaryPath} with model ${modelPath}`);

  const args = [
    '--model', modelPath,
    '--port', '8081',
    '--host', '127.0.0.1',
    '-c', '4096',
    '--threads', String(options.threads || 8),
    '--no-mmap'
  ];

  if (options.useGpu) {
    args.push('--n-gpu-layers', '99');
  } else {
    args.push('--n-gpu-layers', '0');
  }

  llamaProcess = spawn(binaryPath, args, {
    stdio: 'pipe',
    windowsHide: true
  });

  llamaProcess.stdout?.on('data', (data) => console.log(`[Llama] ${data}`));
  llamaProcess.stderr?.on('data', (data) => console.error(`[Llama Error] ${data}`));

  llamaProcess.on('exit', (code) => {
    console.log(`Llama process exited with code ${code}`);
    llamaProcess = null;
  });

  return { success: true };
});

ipcMain.handle('stop-engine', async () => {
  if (llamaProcess) {
    llamaProcess.kill();
    llamaProcess = null;
  }
  return { success: true };
});

ipcMain.handle('check-engine-health', async () => {
  try {
    const res = await fetch('http://127.0.0.1:8081/health');
    return await res.json();
  } catch (e) {
    return { status: 'offline' };
  }
});

// model downloader
ipcMain.handle('download-model', async (event, url: string, filename: string) => {
  const modelsDir = path.join(app.getPath('userData'), 'models');
  await fs.mkdir(modelsDir, { recursive: true });
  const filePath = path.join(modelsDir, filename);

  if (await fs.access(filePath).then(() => true).catch(() => false)) {
    return filePath;
  }

  return new Promise((resolve, reject) => {
    const file = require('node:fs').createWriteStream(filePath);
    https.get(url, (response) => {
      const total = parseInt(response.headers['content-length'] || '0', 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        event.sender.send('download-progress', { downloaded, total });
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath).catch(() => {});
      reject(err.message);
    });
  });
});

// system hardware
ipcMain.handle('get-hardware-info', async () => {
  return {
    total_memory_mb: Math.floor(os.totalmem() / (1024 * 1024)),
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length
  };
});

// filesystem bridge (Cursor-like)
ipcMain.handle('open-directory', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('read-file', async (_event, filePath: string) => {
  return await fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('write-file', async (_event, filePath: string, content: string) => {
  await fs.writeFile(filePath, content, 'utf-8');
  return { success: true };
});

Object.assign(console, log.functions);

console.debug('main: import.meta.env:', import.meta.env);
console.log('main: isDev:', isDev);
console.log('NODE_ENV:', global.process.env.NODE_ENV);
console.log('isPackaged:', app.isPackaged);

// Log unhandled errors
process.on('uncaughtException', async (error) => {
  console.log('Uncaught Exception:', error);
});

process.on('unhandledRejection', async (error) => {
  console.log('Unhandled Rejection:', error);
});

(() => {
  const root = global.process.env.APP_PATH_ROOT ?? import.meta.env.VITE_APP_PATH_ROOT;

  if (root === undefined) {
    console.log('no given APP_PATH_ROOT or VITE_APP_PATH_ROOT. default path is used.');
    return;
  }

  if (!path.isAbsolute(root)) {
    console.log('APP_PATH_ROOT must be absolute path.');
    global.process.exit(1);
  }

  console.log(`APP_PATH_ROOT: ${root}`);

  const subdirName = pkg.name;

  for (const [key, val] of [
    ['appData', ''],
    ['userData', subdirName],
    ['sessionData', subdirName],
  ] as const) {
    app.setPath(key, path.join(root, val));
  }

  app.setAppLogsPath(path.join(root, subdirName, 'Logs'));
})();

console.log('appPath:', app.getAppPath());

const keys: Parameters<typeof app.getPath>[number][] = ['home', 'appData', 'userData', 'sessionData', 'logs', 'temp'];
keys.forEach((key) => console.log(`${key}:`, app.getPath(key)));
console.log('start whenReady');

declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/naming-convention
  var __electron__: typeof electron;
}

(async () => {
  await app.whenReady();
  console.log('App is ready');

  // Load any existing cookies from ElectronStore, set as cookie
  await initCookies();

  const serverBuild = await loadServerBuild();

  protocol.handle('http', async (req) => {
    console.log('Handling request for:', req.url);

    if (isDev) {
      console.log('Dev mode: forwarding to vite server');
      return await fetch(req);
    }

    req.headers.append('Referer', req.referrer);

    try {
      const url = new URL(req.url);

      // Forward requests to specific local server ports
      if (url.port !== `${DEFAULT_PORT}`) {
        console.log('Forwarding request to local server:', req.url);
        return await fetch(req);
      }

      // Always try to serve asset first
      const assetPath = path.join(app.getAppPath(), 'build', 'client');
      const res = await serveAsset(req, assetPath);

      if (res) {
        console.log('Served asset:', req.url);
        return res;
      }

      // Forward all cookies to remix server
      const cookies = await session.defaultSession.cookies.get({});

      if (cookies.length > 0) {
        req.headers.set('Cookie', cookies.map((c) => `${c.name}=${c.value}`).join('; '));

        // Store all cookies
        await storeCookies(cookies);
      }

      // Create request handler with the server build
      const handler = createRequestHandler(serverBuild, 'production');
      console.log('Handling request with server build:', req.url);

      const result = await handler(req, {
        /*
         * Remix app access cloudflare.env
         * Need to pass an empty object to prevent undefined
         */
        // @ts-ignore:next-line
        cloudflare: {},
      });

      return result;
    } catch (err) {
      console.log('Error handling request:', {
        url: req.url,
        error:
          err instanceof Error
            ? {
                message: err.message,
                stack: err.stack,
                cause: err.cause,
              }
            : err,
      });

      const error = err instanceof Error ? err : new Error(String(err));

      return new Response(`Error handling request to ${req.url}: ${error.stack ?? error.message}`, {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      });
    }
  });

  const rendererURL = await (isDev
    ? (async () => {
        await initViteServer();

        if (!viteServer) {
          throw new Error('Vite server is not initialized');
        }

        const listen = await viteServer.listen();
        global.__electron__ = electron;
        viteServer.printUrls();

        return `http://localhost:${listen.config.server.port}`;
      })()
    : `http://localhost:${DEFAULT_PORT}`);

  console.log('Using renderer URL:', rendererURL);

  const win = await createWindow(rendererURL);

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow(rendererURL);
    }
  });

  console.log('end whenReady');

  return win;
})()
  .then((win) => {
    // IPC samples : send and recieve.
    let count = 0;
    setInterval(() => win.webContents.send('ping', `hello from main! ${count++}`), 60 * 1000);
    ipcMain.handle('ipcTest', (event, ...args) => console.log('ipc: renderer -> main', { event, ...args }));

    return win;
  })
  .then((win) => setupMenu(win));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

reloadOnChange();
setupAutoUpdater();
