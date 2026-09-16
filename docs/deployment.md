# Deployment

Moving-on Schedule builds into a static site. All supported platforms serve the same `dist/` folder; no backend, database, or runtime secrets are needed.

## Build settings

| Setting          | Value                                              |
| ---------------- | -------------------------------------------------- |
| Root directory   | Repository root                                    |
| Framework        | React / Vite                                       |
| Node.js          | Node 24 LTS (24.21.0)                              |
| Install command  | `npm ci`, or the platform's lockfile-aware default |
| Build command    | `npm run build`                                    |
| Output directory | `dist`                                             |

Keep `package-lock.json` in Git. Do not publish `node_modules/` or run `npm run dev` as a production server. Validate locally with `npm test` and `npm run build`.

## Deploy to Cloudflare button

The README button opens Cloudflare's **Workers** deployment flow. The included [wrangler.jsonc](../wrangler.jsonc) serves `dist/` through Workers Static Assets without a Worker script or database.

0. If you fork the source, update the `url` parameter in both README buttons to your public repository URL.
1. The source repository must be public and contain the application and Wrangler configuration. Local, uncommitted files are unavailable to the button.
2. Click the button, sign in, and choose your Cloudflare and Git provider accounts.
3. Review the repository and Worker names. Use `npm run build` as the build command and `npx wrangler deploy` as the deploy command; use Node 24 LTS.
4. Complete the deployment flow and open the assigned `workers.dev` address. Custom domains can be configured afterwards.

For manual CLI deployment, from the repository root:

```sh
npm ci
npm run build
npx wrangler@4 login
npx wrangler@4 deploy
```

The final command publishes the site. To check configuration locally without publishing, use `npx wrangler@4 deploy --dry-run` after building.

References: [Deploy buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/), [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/get-started/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

## Cloudflare Pages

1. Push the project to GitHub. In **Workers & Pages**, create a **Pages** project and connect the repository.
2. Select the production branch (`main`) and the `React (Vite)` preset.
3. The root `.node-version` pins Node 24.21.0 LTS. If this project already has a `NODE_VERSION` environment variable, update it to `24.21.0` in both production and preview environments, then save and deploy.
4. Open the assigned `pages.dev` address or bind a custom domain. Future pushes to the production branch trigger deployments.

Pages uses `npm run build` and `dist` directly; the Workers configuration is for the button/Workers flow. No Pages Functions are required.

For a manual upload, build locally and upload `dist/` using **Direct Upload**. A Direct Upload project cannot later switch to Git integration; create a new Pages project if that becomes necessary.

References: [Build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Node version](https://developers.cloudflare.com/pages/configuration/build-image/), [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Vercel and Netlify

| Platform | Setup                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Vercel   | Import the Git repository, select **Vite**, use the build settings above, and choose Node 24.x.                               |
| Netlify  | Import the Git repository, use the repository root as Base Directory, set the build/publish values above, and select Node 24. |

Both support automatic Git deployments and custom domains. The current app has no path-based client routes. If those are added, configure an `index.html` fallback according to the hosting platform's SPA documentation.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vite on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).

## Cloudflare Fonts

The HTML stylesheet link loads Noto Sans SC for English and Simplified Chinese, and Noto Sans TC for Traditional Chinese. Keep it as a Google Fonts `<link>` in `index.html`; Cloudflare Fonts does not rewrite CSS `@import` rules.

For a domain in your Cloudflare zone, enable **Speed → Settings → Content Optimization → Cloudflare Fonts**. On supported pages, Cloudflare rewrites the font definitions and serves the font files from your site's origin. The repository configuration does not enable this dashboard setting, and a `workers.dev` or `pages.dev` deployment alone does not enable it for your custom domain.

After deploying, check the browser Network panel to confirm that font requests use your own origin. Local previews, other hosting providers, and pages Cloudflare cannot transform use Google Fonts directly; system sans-serif remains the fallback when web fonts are unavailable. Cloudflare Fonts is not compatible with APO.

Reference: [Cloudflare Fonts](https://developers.cloudflare.com/speed/optimization/content/fonts/).

## After deployment

- Verify the sample schedule, manual editing, file import/export, and persistence after reload.
- Data remains in each visitor's browser. A deployment does not add accounts, backups, or device synchronization.
- Localhost, preview addresses, and custom domains use separate storage. Export a JSON backup before changing origins, then restore it at the new origin.
- The lazy-loaded Excel module can produce a large-chunk build warning; this does not block deployment.

Last updated: 2026-09-16.
