# Backup and storage formats

Application release: **v0.1** (`0.1.0`). Backup format `1` and storage format `1` are independent of application versions. A future format change must get an explicit migration and tests; unsupported versions are rejected without overwriting data.

## Portable JSON backup

Choose **Display → Export all data (JSON)**. Import through **Import timetable**. The app validates the entire file, shows the semester and meeting count, and requires confirmation before replacing all courses, settings, and preferences. JSON restoration is a complete replacement; use Excel/CSV import for appending meetings. Invalid files never change current data.

The machine-readable contract is [backup-v1.schema.json](../public/schemas/backup-v1.schema.json), published at `/schemas/backup-v1.schema.json`. It uses [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/json-schema-core). [Example backup](examples/backup-v1.json) includes a valid checksum.

| Field               | Meaning                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `format`            | Exactly `moving-on-schedule`                                                                  |
| `version`           | Backup format version, currently `1`                                                          |
| `exportedAt`        | UTC timestamp produced by `Date.toISOString()`                                                |
| `schedule.courses`  | Every meeting, preserving IDs, text, colors, remarks, week order and timing                   |
| `schedule.settings` | Semester name, first date, total weeks and every daily period time                            |
| `schedule.isDemo`   | Keeps the distinction between built-in demo text and user text                                |
| `preferences`       | Effective `locale`, theme preference (`light`, `dark`, `system`) and both display preferences |
| `integrity`         | `{ "algorithm": "SHA-256", "value": "<64 lowercase hex characters>" }`                        |

Course `timing` is explicitly `period` or `time`; legacy period courses gain `timing: "period"` on export. Periods use inclusive integer endpoints, 1–30; clock times use zero-padded 24-hour `HH:mm` and must end later the same day. Days are 1=Monday through 7=Sunday. Weeks must fit the semester and period references must fit the daily period list. Empty or partially filled daily times are retained. Course IDs must be unique. Overlapping courses remain valid.

The schema checks structure and primitive limits. Application validation also checks real calendar dates, chronological daily times, course start/end ordering, unique IDs and references to configured weeks/periods. A checksum cannot make an invalid schedule valid. Unknown fields and unsupported versions are rejected by the JSON importer, preventing silent loss of data from newer formats.

Export captures the current in-memory state, including edits that could not be saved locally. It never translates stored text or reads unrelated site storage. Search text, selected week, open dialogs, derived occurrences and resolved system theme are transient and excluded. The effective language is captured even if originally selected through browser-language detection.

Import accepts UTF-8 JSON, with optional BOM, below 50 MiB. The recovery file downloaded from a storage error is a map of original storage keys to their raw strings; it deliberately preserves broken text and is not a normal importable backup.

## Integrity algorithm

1. Remove only the root `integrity` member from the document.
2. Recursively serialize objects with keys sorted by UTF-16 code-unit order; keep array order unchanged. Use ECMAScript `JSON.stringify` escaping and number serialization for primitive JSON values. Add no whitespace. Strings are not Unicode-normalized. This is the project's **canonical JSON v1** algorithm, not a claim of a general canonicalization standard.
3. Encode that string as UTF-8 and calculate SHA-256 using Web Crypto.
4. Encode the 32-byte result as 64 lowercase hexadecimal characters.

The hash covers all remaining fields, including format/version and export time. Whitespace and object-key reordering do not change it. Course order, notes, settings and preferences do. See `src/integrity.ts` and its independent Node crypto test vector.

This detects accidental changes and damage. The checksum is stored beside the data; anyone who changes the data can recalculate it. It provides neither encryption nor proof of authenticity. JSON backup files are readable plaintext.

## Browser storage and migration

`moving-on-schedule.data` holds one complete JSON document:

```text
{ format: "moving-on-schedule-storage", version: 1,
  revision: <random UUID>, data: { schedule: <SavedData v1>, preferences },
  integrity: { algorithm: "SHA-256", value: <hex> } }
```

Its hash uses the same algorithm over the complete document except `integrity`, including `revision`. On startup the checksum and domain data are verified before rendering a timetable. Damaged/unsupported data stays untouched; automatic saving is paused and original bytes can be downloaded. The user can explicitly restore a validated JSON backup to repair it.

When the new key is absent, the app reads the legacy timetable, locale, theme and display keys. Legacy `zh-CN` / `zh-TW` values migrate to `zh-Hans` / `zh-Hant`; missing display fields keep their historical defaults. Invalid legacy fields block automatic migration. The first user change writes a verified combined snapshot. Legacy keys remain as archival originals and are ignored after migration. Old app tabs must be refreshed: their changes to legacy keys do not update the new snapshot. Deleting only the new key can expose old legacy data again; use a confirmed blank JSON restore or clear all site storage to start over.

All writes use an origin-wide Web Lock. Inside it, the app compares the current stored bytes with the snapshot the editor read, hashes the new snapshot, compares again, writes once, reads back and verifies the result. Only then is the store marked saved internally; normal saving has no visible status row. Rapid edits within a tab are queued. The lock plus snapshot comparison protects against cooperating tabs racing; hash checks alone do not prevent lost updates. Uncooperative scripts or manual developer-tools edits cannot be made transactional with `localStorage`; extra comparisons and storage/focus events detect them when observable.

Other-tab changes or clearing pause writes and preserve this tab's state. **Load saved version** asks for confirmation; export unsaved work first. A JSON restore compares against the snapshot captured during preview, so a later change in another tab blocks that restore too. A failed restore preserves the current in-memory state. Quota errors, denied access and failed read-back never report success; edits remain exportable and failed saves can be retried. A page-exit warning is requested while applied edits are unsaved, subject to browser restrictions.

Web Crypto and Web Locks require a supporting browser and a secure context (HTTPS or localhost). If safe storage cannot run, automatic writes are refused. Private browsing cannot be reliably identified here; the app does not guess. A successful read-back confirms the current browser write, not permanent retention. Private windows may clear data on closing, and browsers may evict site storage. Keep independent JSON backups.

## Verification and diagnostics

- `npm test`: JSON round trips, hash changes, legacy migration, corruption, quota/denied access, failed read-back, queued edits and concurrent writers.
- `npm run test:e2e`: real Chromium download/restore, error states, two tabs and localized responsive controls. Install the runner's browser with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a compatible local Chromium.
- `/build-info.json`: application version, commit, dirty checkout flag, build time, backup format and storage format versions. Git fields are `null` for source archives without Git metadata. No additional main-page version controls are added.
