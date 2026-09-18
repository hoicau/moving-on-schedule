import { createHash } from 'node:crypto';
import type { Plugin, ResolvedConfig } from 'vite';

const stylesheetUrl =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400..800&family=Noto+Sans+TC:wght@400..800&family=Plus+Jakarta+Sans:wght@400..800&display=swap';
// Google uses the user agent to select variable WOFF2 fonts with unicode ranges.
const userAgent =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function assetName(source: string | Uint8Array, extension: string) {
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 16);
  return `fonts/font-${hash}.${extension}`;
}

export function localFonts(fetcher: typeof fetch = fetch): Plugin {
  let config: ResolvedConfig;
  let stylesheetFile: string;

  async function download(url: string) {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetcher(url, {
          headers: { 'User-Agent': userAgent },
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error(`HTTP ${response.status}`);
        }
        return new Uint8Array(await response.arrayBuffer());
      } catch (cause) {
        if (attempt === 2) {
          throw new Error(`Unable to download build font asset: ${url}`, {
            cause,
          });
        }
      }
    }
  }

  return {
    name: 'local-fonts',
    configResolved(resolved) {
      config = resolved;
    },
    async buildStart() {
      if (config.command !== 'build') return;
      const css = new TextDecoder().decode(await download(stylesheetUrl));
      const urls = [
        ...new Set(
          [...css.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1]),
        ),
      ];
      if (
        !css.includes('unicode-range:') ||
        !css.includes('font-weight: 400 800;') ||
        !css.includes("font-family: 'Noto Sans SC';") ||
        !css.includes("font-family: 'Noto Sans TC';") ||
        !css.includes("font-family: 'Plus Jakarta Sans';") ||
        !urls.length ||
        urls.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.origin !== 'https://fonts.gstatic.com' ||
            !parsed.pathname.endsWith('.woff2')
          );
        })
      ) {
        throw new Error(
          'Google Fonts did not return the expected variable WOFF2 subsets.',
        );
      }

      const files = new Map<string, string>();
      const pending = [...urls];
      // Bound concurrency so a build does not open hundreds of connections.
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, async () => {
          for (let url = pending.shift(); url; url = pending.shift()) {
            const source = await download(url);
            if (new TextDecoder().decode(source.subarray(0, 4)) !== 'wOF2') {
              throw new Error(`Invalid WOFF2 font: ${url}`);
            }
            const fileName = assetName(source, 'woff2');
            this.emitFile({ type: 'asset', fileName, source });
            files.set(url, fileName.slice('fonts/'.length));
          }
        }),
      );
      for (const result of results) {
        if (result.status === 'rejected') throw result.reason;
      }

      const source = css.replace(
        /url\(([^)]+)\)/g,
        (_, url: string) => `url(./${files.get(url)})`,
      );
      stylesheetFile = assetName(source, 'css');
      this.emitFile({ type: 'asset', fileName: stylesheetFile, source });
      config.logger.info(
        `Downloaded ${urls.length} font subsets for local hosting.`,
      );
    },
    transformIndexHtml() {
      return [
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href:
              config.command === 'build'
                ? `${config.base || './'}${stylesheetFile}`
                : stylesheetUrl,
          },
          injectTo: 'head',
        },
      ];
    },
  };
}
