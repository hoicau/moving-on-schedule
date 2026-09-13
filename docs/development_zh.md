# 开发指南

使用 Node.js 24 LTS（版本见 `.node-version`）和 npm，通过 `npm ci` 安装锁定版本的依赖。

| 命令              | 用途                                      |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | 启动 Vite，地址为 `http://localhost:5173` |
| `npm test`        | 运行课程、导入和存储校验测试              |
| `npm run build`   | 类型检查并生成静态产物 `dist/`            |
| `npm run preview` | 预览生产构建，默认通常使用 4173 端口      |
| `npm run format`  | 使用 Prettier 格式化项目文件              |

## 源码分工

| 文件                   | 职责                                           |
| ---------------------- | ---------------------------------------------- |
| `src/App.tsx`          | 页面、表单、导入预览和浏览器持久化             |
| `src/schedule.ts`      | 课程模型、示例数据、日期、周次和校验           |
| `src/importer.ts`      | ExcelJS/Papa Parse 导入与 Excel 导出，按需加载 |
| `src/styles.css`       | 响应式布局与视觉样式                           |
| `src/schedule.test.ts` | 领域逻辑和真实 XLSX/CSV 解析测试               |
| `wrangler.jsonc`       | Cloudflare Workers Static Assets 部署配置      |

## i18n

`src/messages.ts` 以 English 为源文案，通过稳定语义 key 保存简体与繁体翻译；缺失翻译时回退 English。通过 `useI18n().t` 使用完整句子和 `{0}` 形式的参数，不对用户输入检查字典。`src/demoText.ts` 仅处理内置示例文案，并兼容旧版示例文本。`src/i18n.ts` 负责语言匹配、插值和 `Intl` 日期格式；`src/LocaleProvider.tsx` 通过统一用户数据 store 读取和修改语言偏好。`src/locale.css` 适配较长文案。标准 locale 为 `en`、`zh-Hans`、`zh-Hant`，存储加载器迁移旧的 `zh-CN` / `zh-TW` 语言偏好。

导入和校验函数接受可选 locale，默认使用 `en`。可接受的文件格式不随界面语言改变。`src/i18n.test.ts` 校验占位符、语言变体、混合语言输入及真实 Excel 往返。新增语言时同步更新语言列表、字典、测试和响应式检查。

## 验证

修改行为后运行 `npm test` 和 `npm run build`。测试覆盖周次表达式、日期边界、冲突、表头和数据行、同名课程配色、XLSX/CSV 解析、存储数据、设置校验、语言匹配、翻译和多语言 Excel 往返。

界面变更还需检查桌面与手机布局、课程增删改、周次过滤、文件导入导出和刷新保存。Excel 模块按需加载，生产构建中较大的 chunk 可能触发 Vite 体积提示。

所有可滚动界面统一使用 `src/styles.css` 的隐藏滚动条和 overscroll 样式，新增滚动区域也要加入 overscroll 规则。在可滚动方向上，到达边界后停止，不回弹，也不带动外层滚动区域；横向列表仍允许上下滚动页面。仅为裁切装饰而设置 overflow 的元素不加入此规则，确保在课程卡片上使用滚轮仍能滚动页面。保留滚轮、触摸和键盘滚动，并确保矮屏下所有控件仍可到达。

课表在所有屏幕尺寸下都完整展开全部节次。小屏幕只在课表内部横向滚动，纵向手势滚动整个页面；不要根据视口限制课表高度。

仅当前一节结束时间与下一节开始时间均已填写、且两者存在间隔时，显示粗分割线。时间相接或缺失时不显示。时间列、每日网格和课程顶部留白共用这一规则，不按固定节次分隔。

## 首页行为

`src/occurrences.ts` 独立于浏览周次计算当前与下一次课程，保留同时发生的课程。作息支持留空和部分填写：仍可识别过去的日期，今日时间不完整的课程会明确提示。新设置默认包含 12 组空白时间，可配置为 1–30 节；表单、存储和导入均按实际节数校验。`dateAtWeek` 以周一为每周基准，`courseOccursInWeek` 排除实际开学日之前的课程，支持不足七天的首周。课程时间采用 discriminated union：旧版数字 `start`/`end`（`timing: "period"` 可省略），或带 `timing: "time"` 的标准 `HH:mm` 字符串。`parseCourseTiming` 校验表单及导入的合并输入；缺少作息时，`courseOverlap` 对混合类型的冲突判断返回未知。按时间安排的课程在周课表中使用独立区域。`src/useNow.ts` 在分钟边界、获得焦点和页面可见性变化时刷新。

`src/ComingUp.tsx` 展示时间线（三条安排及所有近期候选），`src/WeekJourney.tsx` 展示侧栏所选周的时间进度，`src/MascotCard.tsx` 保留原兔子插画。`src/home.css` 管理紧凑首页、课表参照、课程详情与显示菜单。`src/displayPreferences.ts` 定义显示偏好（`showRemarks: false`、`showWeekend: true`），现统一存入完整快照；旧键继续用于迁移。为兼容旧数据，课程存储字段仍为 `note`；英文界面使用 Remark，导出表头使用 `remark`，导入继续兼容旧别名。

## 存储变更

当前存储键为 `moving-on-schedule.data`，包含课表与全部偏好、格式版本及 SHA-256 校验值。`src/storage.ts` 处理旧数据读取、hash 校验、Web Locks、快照比较与回读验证；`src/userDataStore.ts` 处理修改队列、冲突、重试及明确恢复；`src/UserDataProvider.tsx` 提供共享状态并监听存储、焦点和离页事件。`src/backup.ts` 导出当前状态，`src/backupImport.ts` 仅在导入时加载 Ajv。详见[格式、迁移与失败处理](backup-format_zh.md)。

运行 `npm run test:e2e` 验证浏览器数据安全流程。首次使用 `npx playwright install chromium` 安装浏览器，或设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`。`src/BuildFooter.tsx` 显示应用版本和短 commit 链接，构建时间放在悬停提示中。Vite 将同一份元数据写入客户端和 `/build-info.json`；JSON 还包含独立的数据格式版本。末尾的 `*` 表示包含未提交的更改；没有 Git 元数据的源码压缩包仅显示版本。提交后重启开发服务器以刷新构建信息。

保持中英文 README 与 `docs/` 内容一致。依赖、构建产物、凭据和本地 Wrangler 状态不应提交。

## 依赖维护

`.node-version` 将构建环境固定为 Node 24.21.0 LTS，`package.json` 要求 Node 24 或更新版本。发布前使用固定的 LTS 版本验证。修改版本时，同步更新中英文安装与部署文档，以及托管平台中已有的 `NODE_VERSION` 设置。

截至 2026-09-12，ExcelJS 最新稳定版仍为 4.4.0。它的 Node 端间接依赖会在 `npm ci` 时产生 `lodash.isequal`、`glob`、`inflight`、`fstream` 和 `rimraf` 的弃用提示，这些提示不表示构建失败。目前无法通过兼容的 ExcelJS 升级消除全部提示；不要仅为隐藏警告而强制覆盖跨 major 的依赖版本。保留现有 UUID override，更新锁文件后执行 `npm audit`，并用 `npm test` 和 production build 验证真实 XLSX/CSV 导入导出。本次审计未发现已知漏洞；后续安全公告可能改变审计结果。

参考：[ExcelJS 上游依赖讨论](https://github.com/exceljs/exceljs/discussions/3040)、[Node.js 发布计划](https://github.com/nodejs/Release)。
