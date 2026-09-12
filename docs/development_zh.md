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

`src/messages.ts` 以 English 为源文案，通过稳定语义 key 保存简体与繁体翻译；缺失翻译时回退 English。通过 `useI18n().t` 使用完整句子和 `{0}` 形式的参数，不对用户输入检查字典。`src/demoText.ts` 仅处理内置示例文案，并兼容旧版示例文本。`src/i18n.ts` 负责语言匹配、插值和 `Intl` 日期格式；`src/LocaleProvider.tsx` 管理独立的 `moving-on-schedule.locale` 偏好，不修改课表或主题数据。`src/locale.css` 适配较长文案。标准 locale 为 `en`、`zh-Hans`、`zh-Hant`，provider 自动迁移旧的 `zh-CN` / `zh-TW` 语言偏好。

导入和校验函数接受可选 locale，默认使用 `en`。可接受的文件格式不随界面语言改变。`src/i18n.test.ts` 校验占位符、语言变体、混合语言输入及真实 Excel 往返。新增语言时同步更新语言列表、字典、测试和响应式检查。

## 验证

修改行为后运行 `npm test` 和 `npm run build`。测试覆盖周次表达式、日期边界、冲突、表头和数据行、同名课程配色、XLSX/CSV 解析、存储数据、设置校验、语言匹配、翻译和多语言 Excel 往返。

界面变更还需检查桌面与手机布局、课程增删改、周次过滤、文件导入导出和刷新保存。Excel 模块按需加载，生产构建中较大的 chunk 可能触发 Vite 体积提示。

## 首页行为

`src/occurrences.ts` 独立于浏览周次计算当前与下一次课程，保留同时发生的课程。作息支持留空和部分填写：仍可识别过去的日期，今日时间不完整的课程会明确提示。新设置默认包含 12 组空白时间，可配置为 1–30 节；表单、存储和导入均按实际节数校验。`dateAtWeek` 以周一为每周基准，`courseOccursInWeek` 排除实际开学日之前的课程，支持不足七天的首周。课程时间采用 discriminated union：旧版数字 `start`/`end`（`timing: "period"` 可省略），或带 `timing: "time"` 的标准 `HH:mm` 字符串。`parseCourseTiming` 校验表单及导入的合并输入；缺少作息时，`courseOverlap` 对混合类型的冲突判断返回未知。按时间安排的课程在周课表中使用独立区域。`src/useNow.ts` 在分钟边界、获得焦点和页面可见性变化时刷新。

`src/ComingUp.tsx` 展示时间线（三条安排及所有近期候选），`src/WeekJourney.tsx` 展示侧栏所选周的时间进度，`src/MascotCard.tsx` 保留原兔子插画。`src/home.css` 管理紧凑首页、课表参照、课程详情与显示菜单。`src/displayPreferences.ts` 定义独立的 `moving-on-schedule.display` 偏好（`showRemarks: false`、`showWeekend: true`）。为兼容旧数据，课程存储字段仍为 `note`；英文界面使用 Remark，导出表头使用 `remark`，导入继续兼容旧别名。

## 存储变更

当前存储键为 `moving-on-schedule.v1`，schema 版本为 `1`。调整结构时需校验或迁移旧数据。现有加载器遇到损坏数据会提示，直至后续修改才尝试写入。Excel 导出保留课程字段和周次，不包含学期设置或自定义颜色。

保持中英文 README 与 `docs/` 内容一致。依赖、构建产物、凭据和本地 Wrangler 状态不应提交。

## 依赖维护

`.node-version` 将构建环境固定为 Node 24.21.0 LTS，`package.json` 要求 Node 24 或更新版本。发布前使用固定的 LTS 版本验证。修改版本时，同步更新中英文安装与部署文档，以及托管平台中已有的 `NODE_VERSION` 设置。

截至 2026-09-12，ExcelJS 最新稳定版仍为 4.4.0。它的 Node 端间接依赖会在 `npm ci` 时产生 `lodash.isequal`、`glob`、`inflight`、`fstream` 和 `rimraf` 的弃用提示，这些提示不表示构建失败。目前无法通过兼容的 ExcelJS 升级消除全部提示；不要仅为隐藏警告而强制覆盖跨 major 的依赖版本。保留现有 UUID override，更新锁文件后执行 `npm audit`，并用 `npm test` 和 production build 验证真实 XLSX/CSV 导入导出。本次审计未发现已知漏洞；后续安全公告可能改变审计结果。

参考：[ExcelJS 上游依赖讨论](https://github.com/exceljs/exceljs/discussions/3040)、[Node.js 发布计划](https://github.com/nodejs/Release)。
