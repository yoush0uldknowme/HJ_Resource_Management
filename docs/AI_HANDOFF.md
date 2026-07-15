# AI 项目交接状态

> 本文件是跨对话、跨 AI 的精简状态源。每完成一个任务后更新；不要粘贴完整聊天记录。

## 当前阶段

- 总体项目：统一公网门户、内网资料库、资源管理与 NFC 队员卡平台。
- 当前唯一实施目标：内网资料库 MVP。
- 当前任务：L3 前端页面已完成，资料库 MVP 功能已全部实现。
- 主计划：`docs/unified-platform-master-plan.md`。
- 设计冻结：`docs/library-l0-design-freeze.md`。

## 已确认决策

- 资料库必须优先于公网门户、统一登录、NFC 和其他资源模块。
- 资料库第一版集成到现有 Next.js 内网应用，复用当前账号和部署。
- 文件存放在非公开的 `storage/library/`，不能放入 `public/`。
- 下载必须经过服务端鉴权。
- 第一版继续使用 Prisma 和 SQLite，不提前迁移 PostgreSQL、MinIO 或 NAS。
- 第一版只支持 `all_members`、`admins_only` 两种资料可见范围。
- 默认单文件上限为 200 MiB，通过环境变量 `LIBRARY_MAX_FILE_SIZE_MB` 配置。总存储不设配额，靠磁盘监控提醒。
- 公网门户以后使用免费托管地址试运行，但不能代理或穿透访问内网资料。
- NFC 只保存随机链接；正式批量发卡前再购买团队长期控制的域名。
- 上传接口走 API Route Handler，不走 Server Action（50 MiB 超过 Server Action 8mb 限制且不适合大文件）。
- 下载接口不接受 URL token，只认 cookie 鉴权。
- 数据库自动备份内嵌到 server.mjs，不依赖外部调度工具。
- 备份推送到私有仓库 `HJ_DB_Backup`，主仓库 `HJ_Resource_Management` 不存数据库文件。
- `ignoreBuildErrors: true` 已移除，`tsc --noEmit` 通过。
- 第一版文件类型仅限文档（PDF、Word、Excel、PPT、TXT、Markdown、CSV、RTF、OpenDocument），后续按需扩展。
- 分类不预设种子数据，由管理员自行创建和删除。
- `npm run build` 已验证通过（32 页面生成），启动器 BUILD_ID 检测 bug 已修复。

## 当前仓库基线

- 技术栈：Next.js 15、React 19、Prisma 6、SQLite、TypeScript、Vitest。
- 已有模块：登录、管理员和操作员、电机档案、标签、扫码查询、出入库、申请审批、日志、移动端。
- 最近一次验证：`npm test` 8 个测试文件 62 项全过。
- 最近一次验证：`npm run lint`（`tsc --noEmit`）零错误。
- 最近一次验证：`npm run build` 40 路由全部生成。

## 最近完成

- L3 前端页面完成，资料库 MVP 全部功能已实现。
- 新增 7 个页面：/library（列表）、/library/new（上传）、/library/[id]（详情）、/library/[id]/edit（编辑）、/admin/library（管理入口）、/admin/library/categories（分类管理）、/admin/library/audit（审计日志）。
- 上传页和编辑页使用 Server+Client Component 模式，上传通过 XMLHttpRequest 支持进度条。
- 分类管理支持创建、编辑、删除（有文档时禁止删除），实时更新列表。
- 审计日志支持分页，手动关联用户名（LibraryAuditLog 无外键）。
- 导航栏新增"资料库"入口，globals.css 新增资料库专用样式。
- L2 上传与下载 API 完成。
- 新增 6 个 API Route：upload、[id]/download、categories（GET+POST）、categories/[id]（PUT+DELETE）、documents（GET 列表）、documents/[id]（GET+PATCH+DELETE）。
- 创建 `src/lib/library/service.ts`（上传、下载、分类 CRUD、文档 CRUD 业务逻辑，含 SHA-256 计算、孤儿文件清理、事务补偿）。
- 创建 `src/lib/library/slug.ts`（slug 生成、重复 slug 去重，新增 11 项测试）。
- 在 auth 模块新增 `getCurrentUserCookieOnly()`，下载接口只认 cookie 不接受 URL token。
- L1 数据库与安全存储完成（5 张 Prisma 表、安全工具函数、27 项测试）。
- L0 基线与设计冻结完成（gitignore 修复、备份脚本、ignoreBuildErrors 移除、启动器修复）。

## 验证结果

- `npm test`：8 文件 62 项全过（含 27 项安全测试 + 11 项 slug 测试）。
- `npm run lint`（`tsc --noEmit`）：零错误。
- `npm run build`：40 路由全部生成（含 6 个 API route + 7 个页面）。
- `prisma db push`：5 张 Library 表创建成功。

## 待确认或风险

- 需要确认校内服务器固定 IP 或 DHCP 地址保留方式。
- 需要在部署服务器上配置 git 凭证（SSH key 或 PAT）以支持自动备份。
- Git 历史中的旧备份文件 `prisma/dev.db.backup.20260626_195320` 仍在公开仓库历史中，用户选择暂时不清理。
- 当前认证存在 URL token 兼容逻辑，资料库不得扩大该机制的使用范围；统一登录阶段必须替换。
- 文件类型白名单仅含文档，后续如需 CAD/图片/视频需扩展白名单。

## 下一任务

L3 已完成，资料库 MVP 功能全部实现。后续可选优化：

1. **L4 权限细化** — 操作员编辑自己上传的资料、批量操作。
2. **L5 回收站** — 软删除恢复、定期清理过期回收站文件。
3. **实际部署测试** — 在校内服务器上部署，验证备份、HTTPS、systemd 配置。
4. **文件类型扩展** — 根据实际使用反馈，扩展 CAD/图片/视频等类型白名单。

## 更新格式

后续 AI 更新本文件时，应保持简短，并覆盖过时状态：

- 当前阶段和任务
- 新确认的决策
- 实际修改文件
- 验证命令与结果
- 未解决风险或阻塞
- 唯一的下一任务
