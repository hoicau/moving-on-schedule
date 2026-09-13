import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { BuildInfo } from './src/buildInfo.ts';

function readBuildInfo(): BuildInfo {
  const { version } = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
  );
  let commit: string | null = null;
  let dirty: boolean | null = null;
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: new URL('.', import.meta.url),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    dirty = Boolean(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: new URL('.', import.meta.url),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim(),
    );
  } catch {
    /* Source archives may not include Git metadata. */
  }
  return {
    version,
    commit,
    dirty,
    builtAt: new Date().toISOString(),
    backupFormatVersion: 1,
    storageFormatVersion: 1,
  };
}
export default defineConfig(() => {
  const info = readBuildInfo();
  const source = JSON.stringify(info, null, 2) + '\n';
  return {
    define: { __APP_BUILD__: JSON.stringify(info) },
    plugins: [
      react(),
      {
        name: 'build-info',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'build-info.json',
            source,
          });
        },
        configureServer(server) {
          server.middlewares.use('/build-info.json', (_request, response) => {
            response.setHeader('Content-Type', 'application/json');
            response.setHeader('Cache-Control', 'no-store');
            response.end(source);
          });
        },
      },
    ],
    server: { host: '0.0.0.0', port: 5173 },
  };
});
