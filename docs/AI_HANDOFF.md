# AI 项目交接状态

> 本文件是跨对话、跨 AI 的精简状态源。每完成一个任务后更新；不要粘贴完整聊天记录。

## 当前阶段

- 总体项目：统一公网门户、内网资料库、资源管理与 NFC 队员卡平台。
- 当前唯一实施目标：内网资料库 MVP。
- 当前任务：L0 基线与设计冻结已完成，等待 `npm run build` 手动验证后启动 L1。
- 主计划：`docs/unified-platform-master-plan.md`。
- 设计冻结：`docs/library-l0-design-freeze.md`。

## 已确认决策

- 资料库必须优先于公网门户、统一登录、NFC 和其他资源模块。
- 资料库第一版集成到现有 Next.js 内网应用，复用当前账号和部署。
- 文件存放在非公开的 `storage/library/`，不能放入 `public/`。
- 下载必须经过服务端鉴权。
- 第一版继续使用 Prisma 和 SQLite，不提前迁移 PostgreSQL、MinIO 或 NAS。
- 第一版只支持 `all_members`、`admins_only` 两种资料可见范围。
- 默认单文件上限为 50 MiB，并通过环境变量 `LIBRARY_MAX_FILE_SIZE_MB` 配置。
- 公网门户以后使用免费托管地址试运行，但不能代理或穿透访问内网资料。
- NFC 只保存随机链接；正式批量发卡前再购买团队长期控制的域名。
- 上传接口走 API Route Handler，不走 Server Action（50 MiB 超过 Server Action 8mb 限制且不适合大文件）。
- 下载接口不接受 URL token，只认 cookie 鉴权。
- 数据库自动备份内嵌到 server.mjs，不依赖外部调度工具。
- 备份推送到私有仓库 `HJ_DB_Backup`，主仓库 `HJ_Resource_Management` 不存数据库文件。
- `ignoreBuildErrors: true` 已移除，`tsc --noEmit` 通过。

## 当前仓库基线

- 技术栈：Next.js 15、React 19、Prisma 6、SQLite、TypeScript、Vitest。
- 已有模块：登录、管理员和操作员、电机档案、标签、扫码查询、出入库、申请审批、日志、移动端。
- 最近一次规划检查：`npm test` 通过，6 个测试文件共 24 项测试通过。
- 最近一次规划检查：`npm run lint` 通过。
- 生产构建需要在 L0 中重新执行并记录结果。

## 最近完成

- L0 基线与设计冻结完成。
- 修复 gitignore 数据库备份模式不匹配（`dev.db-*` → `dev.db*`），移除泄露的备份文件追踪。
- 创建数据库 GitHub 备份脚本 `scripts/backup-db.mjs`，首次备份已推送到私有仓库。
- 备份逻辑内嵌到 `server.mjs`，应用运行时自动每 24 小时备份一次。
- 移除 `next.config.ts` 中的 `ignoreBuildErrors: true`。
- 更新 systemd 服务配置，新增 `storage/` 和备份仓库路径的写入权限。
- 建立设计冻结文档 `docs/library-l0-design-freeze.md`。

## 验证结果

- `npm test`：6 文件 24 项全过。
- `npm run lint`（`tsc --noEmit`）：零错误。
- `npm run build`：待手动验证（沙箱安全策略拦截 `.next/` 清理）。

## 待确认或风险

- 需手动运行 `npm run build` 确认生产构建（移除 `ignoreBuildErrors` 后首次验证）。
- 需要确认校内服务器固定 IP 或 DHCP 地址保留方式。
- 需要确认资料库初始分类是否满足团队实际资料结构。
- 需要确认 50 MiB 是否覆盖第一批真实资料；不要在没有样本统计前提高上限。
- 需要在部署服务器上配置 git 凭证（SSH key 或 PAT）以支持自动备份。
- Git 历史中的旧备份文件 `prisma/dev.db.backup.20260626_195320` 仍在公开仓库历史中，用户选择暂时不清理。
- 当前认证存在 URL token 兼容逻辑，资料库不得扩大该机制的使用范围；统一登录阶段必须替换。

## 下一任务

L0 已完成，等待项目负责人：

1. 手动运行 `npm run build` 确认构建通过。
2. 审核设计冻结文档 `docs/library-l0-design-freeze.md`。
3. 确认后下发 L1（数据库与安全存储）。

## 更新格式

后续 AI 更新本文件时，应保持简短，并覆盖过时状态：

- 当前阶段和任务
- 新确认的决策
- 实际修改文件
- 验证命令与结果
- 未解决风险或阻塞
- 唯一的下一任务
