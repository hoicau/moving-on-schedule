# Development

Use Node.js 24 LTS (pinned in `.node-version`) and npm. Install locked dependencies with `npm ci`.

| Command           | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Start Vite at `http://localhost:5173`               |
| `npm test`        | Run schedule, import, and storage-validation tests  |
| `npm run build`   | Type-check and build static assets into `dist/`     |
| `npm run preview` | Preview the production build, normally on port 4173 |
| `npm run format`  | Format project files with Prettier                  |

## Source map

| File                   | Responsibility                                               |
| ---------------------- | ------------------------------------------------------------ |
| `src/App.tsx`          | Screens, forms, import preview, and browser persistence      |
| `src/schedule.ts`      | Course model, demo data, dates, weeks, and validation        |
| `src/importer.ts`      | ExcelJS/Papa Parse import and Excel export; loaded on demand |
| `src/styles.css`       | Responsive layout and visual styling                         |
| `src/schedule.test.ts` | Domain and real XLSX/CSV parsing tests                       |
| `wrangler.jsonc`       | Cloudflare Workers Static Assets deployment                  |

## Internationalization

`src/messages.ts` stores an English source catalog and Simplified/Traditional Chinese translations, indexed by stable semantic keys. Use complete messages and `{0}`-style parameters through `useI18n().t`; missing translations fall back to English. Keep user content out of dictionary lookup. `src/demoText.ts` localizes only built-in demo values and recognizes legacy demo text. `src/i18n.ts` handles locale detection, interpolation, and `Intl` date formatting. `src/LocaleProvider.tsx` owns the `moving-on-schedule.locale` preference, separate from the timetable and theme keys. `src/locale.css` accommodates longer text. Canonical locales are `en`, `zh-Hans`, and `zh-Hant`; the provider migrates persisted `zh-CN` / `zh-TW` preferences.

Import and validation functions take an optional locale; their default is `en`. Keep accepted file formats independent of interface language. `src/i18n.test.ts` checks placeholders, locale variants, mixed-language input, and real Excel round trips. When adding a language, update the locale list, dictionary, tests, and responsive checks together.

## Verification

Run `npm test` and `npm run build` after behavior changes. Tests cover week expressions, date boundaries, conflicts, import headers and rows, consistent course colors, XLSX/CSV parsing, saved data, and settings validation, locale detection, translations, and multilingual Excel round trips.

For UI changes, also check desktop and mobile layouts; course creation, editing and deletion; week filtering; file import/export; and reload persistence. Production builds contain a larger, lazy-loaded Excel chunk, so Vite may report a size warning.

## Home behavior

`src/occurrences.ts` computes current and next meetings independently of the browsed week and retains simultaneous meetings. Blank or partial period times are supported: past dates can still be identified, while today’s uncertain meetings stay explicit. New settings default to 12 blank time pairs and support 1–30 periods. Parsing, persistence, and imports validate against the configured count. `dateAtWeek` anchors weeks on Monday; `courseOccursInWeek` excludes dates before the actual semester start, allowing partial first weeks. Course timing is a discriminated union: legacy numeric `start`/`end` with optional `timing: "period"`, or `timing: "time"` with normalized `HH:mm` strings. `parseCourseTiming` validates the combined form/import inputs; `courseOverlap` returns unknown for mixed timing kinds when bell times are incomplete. Clock-time courses use a separate band in the weekly grid. `src/useNow.ts` updates on minute boundaries, focus, and visibility changes.

`src/ComingUp.tsx` renders the occurrence timeline (three meetings plus all immediate candidates); `src/WeekJourney.tsx` shows selected-week elapsed time in the sidebar, and `src/MascotCard.tsx` restores the rabbit illustration. `src/home.css` contains the responsive home layout, sticky table references, course details, and display menu. `src/displayPreferences.ts` defines the independent `moving-on-schedule.display` preference (`showRemarks: false`, `showWeekend: true`). The stored course field remains `note` for compatibility; English UI uses Remark and exports use `remark`, while imports retain old aliases.

## Storage changes

The current key is `moving-on-schedule.v1`, with schema version `1`. Validate or migrate saved data when changing the schema. The existing loader reports malformed data and avoids overwriting it until a subsequent edit. Excel exports preserve course fields and weeks, but not semester settings or custom colors.

Keep the English and Chinese README and `docs/` pages aligned. Do not commit dependencies, build output, credentials, or local Wrangler state.

## Dependency maintenance

The build runtime is pinned to Node 24.21.0 LTS in `.node-version`; `package.json` requires Node 24 or newer. Use the pinned LTS version for release checks. When changing it, update the English and Chinese setup/deployment guides and any hosting `NODE_VERSION` overrides together.

ExcelJS 4.4.0 is the latest stable upstream release checked on 2026-09-12. Its Node-side dependencies still produce deprecation notices for `lodash.isequal`, `glob`, `inflight`, `fstream`, and `rimraf` during `npm ci`. These notices do not mean the build failed. They cannot all be removed by a compatible ExcelJS update today; avoid forcing major dependency overrides just to hide them. Keep the existing UUID override, run `npm audit` after lockfile changes, and verify real XLSX/CSV import/export with `npm test` and a production build. The audit reported no known vulnerabilities on this check; that result may change as advisories are published.

References: [ExcelJS upstream dependency discussion](https://github.com/exceljs/exceljs/discussions/3040), [Node.js release schedule](https://github.com/nodejs/Release).
