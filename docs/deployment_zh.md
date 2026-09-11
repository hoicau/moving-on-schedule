# 部署指南

Moving-on Schedule 构建为静态站点，平台托管 `dist/` 文件夹，无需后端、数据库或运行时密钥。

## 构建配置

| 配置项   | 值                                           |
| -------- | -------------------------------------------- |
| 根目录   | 仓库根目录                                   |
| 框架     | React / Vite                                 |
| Node.js  | Node 22，至少 22.12.0                        |
| 安装命令 | `npm ci`，或平台支持 lockfile 的默认安装流程 |
| 构建命令 | `npm run build`                              |
| 输出目录 | `dist`                                       |

将 `package-lock.json` 保留在 Git 中。无需发布 `node_modules/`，也无需在线上运行 `npm run dev`。发布前使用 `npm test` 和 `npm run build` 验证。

## Deploy to Cloudflare 按钮

README 中的按钮打开 Cloudflare **Workers** 部署流程。项目中的 [wrangler.jsonc](../wrangler.jsonc) 通过 Workers Static Assets 托管 `dist/`，无需 Worker 脚本或数据库。

0. Fork 仓库后请将 README 按钮中的 `url` 参数更新为自己的公开仓库地址。
1. 仓库必须公开，并包含应用代码与 Wrangler 配置；按钮无法读取本地未提交的文件。
2. 点击按钮并登录，选择 Cloudflare 及 Git 平台账号。
3. 检查仓库名和 Worker 名，构建命令使用 `npm run build`，部署命令使用 `npx wrangler deploy`，Node 版本使用 22.12+。
4. 完成部署后打开分配的 `workers.dev` 地址，之后可绑定自定义域名。

也可在仓库根目录通过 CLI 手动部署：

```sh
npm ci
npm run build
npx wrangler@4 login
npx wrangler@4 deploy
```

最后一条命令会发布站点。只检查配置时，先构建，再运行 `npx wrangler@4 deploy --dry-run`。

参考：[部署按钮](https://developers.cloudflare.com/workers/platform/deploy-buttons/)、[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/get-started/)、[Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/)。

## Cloudflare Pages

1. 将项目推送到 GitHub，在 **Workers & Pages** 中创建 **Pages** 项目并连接仓库。
2. 选择生产分支（`main`）和 `React (Vite)` 预设。
3. 设置构建环境变量 `NODE_VERSION=22`，保存并部署。
4. 使用分配的 `pages.dev` 地址或绑定自定义域名；后续推送到生产分支会触发部署。

Pages 直接使用 `npm run build` 和 `dist`；Workers 配置用于按钮及 Workers 流程。无需 Pages Functions。

手动上传时，先在本地构建，再通过 **Direct Upload** 上传 `dist/`。Direct Upload 项目之后无法直接切换到 Git 集成，需要新建 Pages 项目。

参考：[构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)、[Node 版本](https://developers.cloudflare.com/pages/configuration/build-image/)、[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)。

## Vercel 与 Netlify

| 平台    | 设置                                                                                   |
| ------- | -------------------------------------------------------------------------------------- |
| Vercel  | 导入 Git 仓库，框架选择 **Vite**，使用上面的构建配置和 Node 22.x。                     |
| Netlify | 导入 Git 仓库，Base Directory 使用仓库根目录，填写上面的构建与发布配置，选择 Node 22。 |

两者均支持 Git 自动部署与自定义域名。当前应用没有基于 URL 路径的前端路由；后续增加时，请按平台 SPA 文档配置回退到 `index.html`。

参考：[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)、[Vite on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)。

## 上线后

- 检查示例课表、手动编辑、文件导入导出，以及刷新后的数据保留。
- 数据仍保存在每位用户的浏览器中，部署不提供账号、备份或跨设备同步。
- 本地地址、预览域名、自定义域名的存储相互独立。更换前端页面前请先导出课程，在新地址重新填写学期设置。
- Google Fonts 无法访问时使用系统字体。
- 按需加载的 Excel 模块可能触发 chunk 较大的构建提示，不影响部署。

文档基于 2026-09-11 版本，前端行为以最新文档为准。
