# 部署指南

Moving-on Schedule 构建为静态站点，平台托管 `dist/` 文件夹，无需后端、数据库或运行时密钥。

## 构建配置

| 配置项   | 值                                           |
| -------- | -------------------------------------------- |
| 根目录   | 仓库根目录                                   |
| 框架     | React / Vite                                 |
| Node.js  | Node 24 LTS（24.21.0）                       |
| 安装命令 | `npm ci`，或平台支持 lockfile 的默认安装流程 |
| 构建命令 | `npm run build`                              |
| 输出目录 | `dist`                                       |

将 `package-lock.json` 保留在 Git 中。无需发布 `node_modules/`，也无需在线上运行 `npm run dev`。发布前使用 `npm test` 和 `npm run build` 验证。

## Deploy to Cloudflare 按钮

README 中的按钮打开 Cloudflare **Workers** 部署流程。项目中的 [wrangler.jsonc](../wrangler.jsonc) 通过 Workers Static Assets 托管 `dist/`，无需 Worker 脚本或数据库。

0. Fork 仓库后请将 README 按钮中的 `url` 参数更新为自己的公开仓库地址。
1. 仓库必须公开，并包含应用代码与 Wrangler 配置；按钮无法读取本地未提交的文件。
2. 点击按钮并登录，选择 Cloudflare 及 Git 平台账号。
3. 检查仓库名和 Worker 名，构建命令使用 `npm run build`，部署命令使用 `npx wrangler deploy`，Node 版本使用 24 LTS。
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
3. 根目录的 `.node-version` 已固定 Node 24.21.0 LTS。如果项目已配置 `NODE_VERSION` 环境变量，请将 production 和 preview 环境的值都更新为 `24.21.0`，保存并部署。
4. 使用分配的 `pages.dev` 地址或绑定自定义域名；后续推送到生产分支会触发部署。

Pages 直接使用 `npm run build` 和 `dist`；Workers 配置用于按钮及 Workers 流程。无需 Pages Functions。

手动上传时，先在本地构建，再通过 **Direct Upload** 上传 `dist/`。Direct Upload 项目之后无法直接切换到 Git 集成，需要新建 Pages 项目。

参考：[构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)、[Node 版本](https://developers.cloudflare.com/pages/configuration/build-image/)、[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)。

## Vercel 与 Netlify

| 平台    | 设置                                                                                   |
| ------- | -------------------------------------------------------------------------------------- |
| Vercel  | 导入 Git 仓库，框架选择 **Vite**，使用上面的构建配置和 Node 24.x。                     |
| Netlify | 导入 Git 仓库，Base Directory 使用仓库根目录，填写上面的构建与发布配置，选择 Node 24。 |

两者均支持 Git 自动部署与自定义域名。当前应用没有基于 URL 路径的前端路由；后续增加时，请按平台 SPA 文档配置回退到 `index.html`。

参考：[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)、[Vite on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)。

## Cloudflare Fonts

HTML 中的 stylesheet link 为英文和简体中文加载 Noto Sans SC，为繁体中文加载 Noto Sans TC。请保留 `index.html` 中的 Google Fonts `<link>`；Cloudflare Fonts 不支持改写 CSS `@import`。

对于 Cloudflare zone 下的域名，在控制台开启 **Speed → Settings → Content Optimization → Cloudflare Fonts**。Cloudflare 会在支持的页面上改写字体定义，通过站点同源地址提供字体文件。仓库配置不会开启此控制台选项，单独部署到 `workers.dev` 或 `pages.dev` 也不会为自定义域名开启它。

部署后检查浏览器 Network 面板，确认字体请求使用站点同源地址。本地预览、其他托管平台，以及 Cloudflare 无法转换的页面仍直接使用 Google Fonts；Web 字体无法加载时回退到系统 sans-serif。Cloudflare Fonts 与 APO 不兼容。

参考：[Cloudflare Fonts](https://developers.cloudflare.com/speed/optimization/content/fonts/)。

## 页脚备案信息

如网站需要在中国大陆境内部署，构建前复制 [`.env.production.example`](../.env.production.example) 创建 `.env.production` 文件。ICP 与公安备案分别配置，各项 `ID` 为空或仅包含空格时隐藏，默认均为空。

- ICP 备案：在 `VITE_ICP_ID` 中填写 ICP 备案号，并保留或更新对应的 `VITE_ICP_LINK`。
- 公安备案：从官方 HTML 代码中复制备案文字和完整的 `href`，分别填入 `VITE_PUBLIC_SECURITY_ID` 和 `VITE_PUBLIC_SECURITY_LINK`。将下载的官方图标放进 `public/`，例如 `public/beian-icon.png`，然后将 `VITE_PUBLIC_SECURITY_ICON` 设为 `/beian-icon.png`。

组件使用站点样式渲染这些字段。桌面端通过 gap 分隔各项，移动端每项独立一行，公安备案图标与备案文字保持同行。

## 上线后

- 检查示例课表、手动编辑、文件导入导出，以及刷新后的数据保留。
- 数据仍保存在每位用户的浏览器中，部署不提供账号、备份或跨设备同步。
- 本地地址、预览域名、自定义域名的存储相互独立。更换地址前请先导出 JSON 备份，在新地址恢复全部数据。
- 按需加载的 Excel 模块可能触发 chunk 较大的构建提示，不影响部署。

最后更新：2026-09-16。
