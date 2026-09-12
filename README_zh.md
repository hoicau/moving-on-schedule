# Moving-on Schedule

[English](README.md) | 简体中文

一款浅蓝色二次元可爱风 Web 课程表，支持 Excel 导入和手动录入。基于 React、TypeScript 和 Vite。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fhoicau%2Fmoving-on-schedule)

按钮部署至 Cloudflare Workers Static Assets；[部署指南](docs/deployment_zh.md) 也介绍了 Cloudflare Pages、Vercel 和 Netlify。

## 功能

- English、简体中文、繁體中文界面与本地化导入模板，以 English 为源语言和 fallback，自动记住语言偏好。
- 浅色、深色与跟随系统三种外观，自动记住偏好。
- 适配桌面与手机的周视图、课程列表、搜索和周末显示切换。
- 添加、编辑、删除课程，自定义颜色、教室、教师和备注，可选择是否在首页显示备注。
- 支持连续周、指定周及单双周，提示课程时间冲突。
- 导入 `.xlsx` / UTF-8 `.csv`，支持校验、预览、模板下载和课程导出。
- 支持按节次或 24 小时制实际时间安排课程。
- 自定义学期与作息时间（默认留空、允许部分填写），自动保存到当前浏览器。

## 快速开始

需要 Node.js 24 LTS（版本见 `.node-version`）和 npm。在仓库根目录运行：

```sh
npm ci
npm run dev
```

打开 <http://localhost:5173>。可体验示例课表，选择「使用空白课表」，或直接导入文件。

## 文档

- [使用](docs/usage_zh.md)
- [部署指南](docs/deployment_zh.md)
- [开发与验证](docs/development_zh.md)

课程数据保存在当前浏览器，暂无账号或云同步。清除站点数据或更换域名前，请先导出课程。表格导入需遵循文档中的逐行格式。

## 许可证

本项目采用 [MIT License](LICENSE)。Copyright (c) 2026 hoicau。

GitHub 图标来自 [Octicons](https://github.com/primer/octicons)，保留其 [MIT 许可与版权声明](docs/octicons-LICENSE.txt)。第三方依赖遵循各自的许可证。
