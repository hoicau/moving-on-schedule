# Moving-on Schedule

English | [简体中文](README_zh.md)

An anime-inspired class timetable with a light-blue theme, Excel import, and manual editing. Built with React, TypeScript, and Vite.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fhoicau%2Fmoving-on-schedule)

The button deploys to Cloudflare Workers Static Assets. [Deployment guide](docs/deployment.md) also covers Cloudflare Pages, Vercel, and Netlify.

## Features

- English, Simplified Chinese, and Traditional Chinese UI, with English as the base/fallback language, localized templates, and saved language preference.
- Light, dark, and system appearance modes, with a saved preference.
- Responsive week and list views, course search, and optional weekends.
- Add, edit, and delete classes with custom colors, rooms, teachers, and remarks; optional home-page remark display.
- Schedule by period number or 24-hour clock time; support consecutive, selected, odd, or even teaching weeks and conflict checks.
- Import `.xlsx` / UTF-8 `.csv` with validation and preview; download templates and export courses.
- Export and restore complete JSON backups, including settings and preferences, with SHA-256 integrity checks.
- Verified local saves, legacy migration, recovery downloads and protection against overwrites from other tabs.
- Customize semester dates and optional class times (blank by default), with automatic browser storage.

## Quick start

Requires Node.js 24 LTS (pinned in `.node-version`) and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open <http://localhost:5173>. Start with the sample timetable, choose **Start fresh** for a blank schedule, or import a file.

## Documentation

- [Usage](docs/usage.md)
- [JSON backups and storage safety](docs/backup-format.md)
- [Deployment](docs/deployment.md)
- [Development and verification](docs/development.md)

Course data stays in the current browser. There are no accounts or cloud sync; export a JSON backup before clearing site data or switching domains. Private browsing may discard local data on exit. Spreadsheet imports require the documented row format.

## License

Licensed under the [MIT License](LICENSE). Copyright (c) 2026 hoicau.

The GitHub icon comes from [Octicons](https://github.com/primer/octicons) and retains its [MIT license and copyright notice](docs/octicons-LICENSE.txt). Third-party dependencies retain their respective licenses.
