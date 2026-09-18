import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { build } from 'vite';
import { localFonts } from './fonts.ts';

const fontUrl = 'https://fonts.gstatic.com/s/test/subset.woff2';
const css = ['Noto Sans SC', 'Noto Sans TC', 'Plus Jakarta Sans']
  .map(
    (family) => `@font-face {
  font-family: '${family}';
  font-weight: 400 800;
  font-display: swap;
  src: url(${fontUrl}) format('woff2');
  unicode-range: U+4E00-4E01;
}`,
  )
  .join('\n');

async function buildFixture(fetcher: typeof fetch, base = '/') {
  const root = await mkdtemp(join(tmpdir(), 'moving-on-font-test-'));
  try {
    await writeFile(
      join(root, 'index.html'),
      '<html><head></head><body>一</body></html>',
    );
    const result = await build({
      root,
      base,
      configFile: false,
      logLevel: 'silent',
      plugins: [localFonts(fetcher)],
      build: { write: false },
    });
    assert(!Array.isArray(result) && 'output' in result);
    return result.output;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

for (const base of ['/', '/schedule/', './']) {
  test(`font build preserves subsets and serves local assets with base ${base}`, async () => {
    const requests: string[] = [];
    const output = await buildFixture(async (input) => {
      const url = String(input);
      requests.push(url);
      return new Response(url === fontUrl ? 'wOF2-font-fixture' : css);
    }, base);
    const assets = output.filter((entry) => entry.type === 'asset');
    const stylesheet = assets.find((entry) => entry.fileName.endsWith('.css'))!;
    const html = assets.find((entry) => entry.fileName === 'index.html')!;
    const fonts = assets.filter((entry) => entry.fileName.endsWith('.woff2'));
    assert.equal(fonts.length, 1);
    assert.equal(requests.filter((url) => url === fontUrl).length, 1);
    assert(
      String(html.source).includes(`href="${base}${stylesheet.fileName}"`),
    );
    assert.equal(
      stylesheet.source,
      css.replaceAll(fontUrl, `./${fonts[0].fileName.slice('fonts/'.length)}`),
    );
    assert(!String(html.source).includes('googleapis.com'));
    assert(!String(stylesheet.source).includes('gstatic.com'));
  });
}

test('font build retries transient failures', async () => {
  let attempts = 0;
  await buildFixture(async (input) => {
    if (String(input) !== fontUrl) return new Response(css);
    attempts++;
    return attempts === 1
      ? new Response('Unavailable', { status: 503 })
      : new Response('wOF2-font-fixture');
  });
  assert.equal(attempts, 2);
});

test('font build fails when a subset cannot be downloaded', async () => {
  await assert.rejects(
    buildFixture(async (input) =>
      String(input) === fontUrl
        ? new Response('Unavailable', { status: 503 })
        : new Response(css),
    ),
    /Unable to download build font asset/,
  );
});

test('font build rejects unexpected CSS and corrupt font responses', async () => {
  await assert.rejects(
    buildFixture(async () => new Response(css.replaceAll('.woff2', '.ttf'))),
    /expected variable WOFF2 subsets/,
  );
  await assert.rejects(
    buildFixture(
      async (input) =>
        new Response(String(input) === fontUrl ? '<html>Error</html>' : css),
    ),
    /Invalid WOFF2 font/,
  );
});
