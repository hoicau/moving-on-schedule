# Moving-on Schedule

English | [简体中文](README_zh.md)

An anime-inspired class timetable with a light-blue theme, Excel import, and manual editing. Built with React, TypeScript, and Vite.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fhoicau%2Fmoving-on-schedule)

The button deploys to Cloudflare Workers Static Assets. [Deployment guide](docs/deployment.md) also covers Cloudflare Pages, Vercel, and Netlify.

## Features

- English, Simplified Chinese, and Traditional Chinese UI, with localized templates and saved language preference.
- Light, dark, and system appearance modes, with a saved preference.
- Responsive week and list views, course search, and optional weekends.
- Add, edit, and delete classes with custom colors, rooms, teachers, and notes.
- Schedule consecutive, selected, odd, or even teaching weeks; see time conflicts.
- Import `.xlsx` / UTF-8 `.csv` with validation and preview; download templates and export courses.
- Customize semester dates and class times, with automatic browser storage.

## Quick start

Requires Node.js 22.12+ and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open <http://localhost:5173>. Start with the sample timetable, choose **使用空白课表** for a blank schedule, or import a file.

## Documentation

- [Usage](docs/usage.md)
- [Deployment](docs/deployment.md)
- [Development and verification](docs/development.md)

Course data stays in the current browser. There are no accounts or cloud sync; export your courses before clearing site data or switching domains. Spreadsheet imports require the documented row format.
