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

## Self-hosted fonts

`npm run build` downloads the variable Plus Jakarta Sans, Noto Sans SC, and Noto Sans TC fonts (weights 400–800) from Google Fonts. The build preserves Google's WOFF2 subsets and `unicode-range` declarations, writes content-hashed files under `dist/fonts/`, and replaces the external stylesheet with a local one. Browsers download only the subsets needed for the displayed text. All upstream subsets are retained so imported course names and other user content remain covered.

The build environment needs HTTPS access to `fonts.googleapis.com` and `fonts.gstatic.com`. Downloads use six concurrent workers, a 30-second timeout per request, and up to three attempts. Every build downloads the current upstream fonts; there is no persistent font cache. A failed download fails the build. Font binaries are generated assets and are not committed to Git. The SIL Open Font License notices in `public/fonts/` are copied into the output alongside the fonts.

Production builds and `npm run preview` serve fonts from the site's origin on every hosting platform. Cloudflare Fonts is no longer required. `npm run dev` still uses Google Fonts directly; system sans-serif remains the fallback when web fonts are unavailable.

After deploying, check the browser Network panel: font requests should point to your site's `fonts/` directory, with no requests to Google Fonts. Plus Jakarta Sans renders Latin text; Noto Sans SC and Noto Sans TC provide Simplified and Traditional Chinese glyphs respectively. Switch between all three interface languages to check font loading.

Reference: [Google Fonts WOFF2 and unicode-range subsets](https://developers.googleblog.com/smaller-fonts-with-woff-20-and-unicode-range/).

## Footer filing information

If the website needs to be deployed within Chinese mainland, copy [`.env.production.example`](`../.env.production.example`) to create a `.env.production` file before building. ICP and public security filings are configured independently; each entry is hidden when its `ID` is empty or contains only whitespace. Both are empty by default.

- ICP filing: set `VITE_ICP_ID` to your ICP filing number and keep or update its `VITE_ICP_LINK`.
- Public security filing: copy the filing text and complete `href` from the official HTML snippet into `VITE_PUBLIC_SECURITY_ID` and `VITE_PUBLIC_SECURITY_LINK`. Download the official icon to `public/` (for example, `public/beian-icon.png`) and set `VITE_PUBLIC_SECURITY_ICON` to `/beian-icon.png`.

The component renders these fields using the site's styles. Desktop items use a gap, while mobile displays each entry on a separate line. The public security icon stays beside its filing text.

## After deployment

- Verify the sample schedule, manual editing, file import/export, and persistence after reload.
- Data remains in each visitor's browser. A deployment does not add accounts, backups, or device synchronization.
- Localhost, preview addresses, and custom domains use separate storage. Export a JSON backup before changing origins, then restore it at the new origin.
- The lazy-loaded Excel module can produce a large-chunk build warning; this does not block deployment.

Last updated: 2026-09-16.
