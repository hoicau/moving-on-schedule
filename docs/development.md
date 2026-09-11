# Development

Use Node.js 22.12+ and npm. Install locked dependencies with `npm ci`.

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

`src/messages.ts` stores Simplified Chinese source messages with English and Traditional Chinese translations. Use complete messages and `{0}`-style parameters through `useI18n().t`; keep user content out of the dictionary lookup. `src/i18n.ts` handles locale detection, interpolation, and `Intl` date formatting. `src/LocaleProvider.tsx` owns the `moving-on-schedule.locale` preference, separate from the timetable and theme keys. `src/locale.css` accommodates longer text.

Import and validation functions take an optional locale; their default remains `zh-CN` for existing callers. Keep accepted file formats independent of interface language. `src/i18n.test.ts` checks placeholders, locale variants, mixed-language input, and real Excel round trips. When adding a language, update the locale list, dictionary, tests, and responsive checks together.

## Verification

Run `npm test` and `npm run build` after behavior changes. Tests cover week expressions, date boundaries, conflicts, import headers and rows, consistent course colors, XLSX/CSV parsing, saved data, and settings validation, locale detection, translations, and multilingual Excel round trips.

For UI changes, also check desktop and mobile layouts; course creation, editing and deletion; week filtering; file import/export; and reload persistence. Production builds contain a larger, lazy-loaded Excel chunk, so Vite may report a size warning.

## Storage changes

The current key is `moving-on-schedule.v1`, with schema version `1`. Validate or migrate saved data when changing the schema. The existing loader reports malformed data and avoids overwriting it until a subsequent edit. Excel exports preserve course fields and weeks, but not semester settings or custom colors.

Keep the English and Chinese README and `docs/` pages aligned. Do not commit dependencies, build output, credentials, or local Wrangler state.
