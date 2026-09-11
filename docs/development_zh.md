# 开发指南

使用 Node.js 22.12+ 和 npm，通过 `npm ci` 安装锁定版本的依赖。

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

`src/messages.ts` 以简体中文为源文案，保存 English 与繁体翻译。通过 `useI18n().t` 使用完整句子和 `{0}` 形式的参数，不对用户输入检查字典。`src/i18n.ts` 负责语言匹配、插值和 `Intl` 日期格式；`src/LocaleProvider.tsx` 管理独立的 `moving-on-schedule.locale` 偏好，不修改课表或主题数据。`src/locale.css` 适配较长文案。

导入和校验函数接受可选 locale，默认维持 `zh-CN`，兼容已有调用。可接受的文件格式不随界面语言改变。`src/i18n.test.ts` 校验占位符、语言变体、混合语言输入及真实 Excel 往返。新增语言时同步更新语言列表、字典、测试和响应式检查。

## 验证

修改行为后运行 `npm test` 和 `npm run build`。测试覆盖周次表达式、日期边界、冲突、表头和数据行、同名课程配色、XLSX/CSV 解析、存储数据、设置校验、语言匹配、翻译和多语言 Excel 往返。

界面变更还需检查桌面与手机布局、课程增删改、周次过滤、文件导入导出和刷新保存。Excel 模块按需加载，生产构建中较大的 chunk 可能触发 Vite 体积提示。

## 存储变更

当前存储键为 `moving-on-schedule.v1`，schema 版本为 `1`。调整结构时需校验或迁移旧数据。现有加载器遇到损坏数据会提示，直至后续修改才尝试写入。Excel 导出保留课程字段和周次，不包含学期设置或自定义颜色。

保持中英文 README 与 `docs/` 内容一致。依赖、构建产物、凭据和本地 Wrangler 状态不应提交。
