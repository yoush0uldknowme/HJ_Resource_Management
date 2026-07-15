# 资料库 L0 基线与设计冻结

> 本文件是资料库 MVP 的设计基线。L1 至 L6 照此执行，不得静默改变。
>
> 冻结日期：2026-07-16

## 1. 基线验证结果

| 命令 | 结果 | 备注 |
|---|---|---|
| `npm test` | ✅ 6 文件 24 项全过 | |
| `npm run lint` (`tsc --noEmit`) | ✅ 零错误 | |
| `npm run build` | ✅ 32 页面全部生成 | BUILD_ID: wF7d8axyaPUrEEBoYKZqg |
| `ignoreBuildErrors` | ✅ 已移除 | `tsc --noEmit` 通过，可安全移除 |

### L0 期间修改的文件

- `.gitignore` — 修正 `dev.db*` 模式，新增 `storage/` 规则
- `next.config.ts` — 移除 `typescript.ignoreBuildErrors`
- `server.mjs` — 新增自动数据库备份（子进程定时执行）
- `scripts/backup-db.mjs` — 新建，数据库 GitHub 备份脚本
- `deploy/systemd/hj-resource.service` — 新增备份和 storage 路径的 ReadWritePaths
- `prisma/dev.db.backup.20260626_195320` — 从 git 追踪中移除

## 2. 数据库现状盘点

| 表 | 行数 | 说明 |
|---|---|---|
| User | 3 | 管理员和操作员账号 |
| Motor | 113 | 电机档案 |
| MotorPhoto | 103 | 电机照片（存于 `public/uploads/motors/`） |
| MotorTransaction | 162 | 出入库记录 |
| OutboundRequest | 5 | 出库申请 |

- 数据库文件：`prisma/dev.db`（68 KB）
- 现有照片目录：`public/uploads/motors/{motorId}/`，共 104 个文件
- 现有本地备份脚本：`scripts/backup.js`（备份 DB + uploads 到本地 `backups/`）
- 新增 GitHub 备份脚本：`scripts/backup-db.mjs`（备份 DB 到私有仓库 `HJ_DB_Backup`）

## 3. 冻结的 URL 结构

```
/library                 资料列表与搜索
/library/new             上传资料
/library/[id]            资料详情
/library/[id]/edit       编辑元数据（管理员）
/admin/library           资料库管理
/admin/library/categories 分类管理
/admin/library/audit     审计日志
/api/library/[id]/download 鉴权下载
/api/library/upload        上传接口（L2 实现，不走 Server Action）
```

## 4. 冻结的数据模型

### LibraryCategory

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int (autoincrement) | 主键 |
| name | String | 分类名称 |
| slug | String @unique | URL 友好标识 |
| description | String? | 分类说明 |
| parentId | Int? | 父分类（第一版界面只支持一级，结构预留） |
| sortOrder | Int | 排序权重 |
| isActive | Boolean | 是否启用 |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### LibraryDocument

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int (autoincrement) | 主键 |
| title | String | 标题 |
| description | String? | 说明 |
| originalFileName | String | 原始文件名（元数据） |
| storedFileName | String | UUID 存储文件名 |
| storagePath | String | 相对存储路径 |
| fileExtension | String | 扩展名（小写，含点） |
| mimeType | String | MIME 类型（不信任客户端，服务端判定） |
| fileSize | Int | 文件大小（字节） |
| sha256 | String | SHA-256 校验值 |
| categoryId | Int | 分类 ID |
| visibility | String | `all_members` 或 `admins_only` |
| status | String | `active` 或 `archived` |
| uploaderId | Int | 上传人 User ID |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| archivedAt | DateTime? | 归档时间 |

### LibraryTag

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int (autoincrement) | 主键 |
| name | String @unique | 标签名称 |
| slug | String @unique | URL 友好标识 |
| createdAt | DateTime | |

### LibraryDocumentTag

| 字段 | 类型 | 说明 |
|---|---|---|
| documentId | Int | 复合主键 |
| tagId | Int | 复合主键 |
| | | 复合唯一约束 |

### LibraryAuditLog

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int (autoincrement) | 主键 |
| documentId | Int | 允许资料被移除后保留日志（不加外键级联） |
| actorId | Int | 操作人 User ID |
| action | String | `upload`/`download`/`update`/`archive`/`restore` |
| detail | String? | 只记录必要信息，不写密码、令牌或文件内容 |
| createdAt | DateTime | |

## 5. 冻结的权限表

| 操作 | 管理员 | 操作员 |
|---|---:|---:|
| 浏览普通资料 (all_members) | 是 | 是 |
| 下载普通资料 | 是 | 是 |
| 浏览管理员资料 (admins_only) | 是 | 否 |
| 上传资料 | 是 | 是 |
| 编辑自己上传资料 | 是 | 第一版否 |
| 编辑任意资料 | 是 | 否 |
| 停用和恢复资料 | 是 | 否 |
| 管理分类和标签 | 是 | 否 |
| 查看审计日志 | 是 | 否 |

复用现有 `requireAdmin()`、`requireOperator()`、`requireCurrentUser()` 权限守卫。

## 6. 冻结的文件限制和安全规则

### 存储位置

- 默认目录：`storage/library/`
- **不得位于 `public/` 下**
- 数据库只保存相对存储路径
- 存储文件名使用随机 UUID，原始文件名只作为元数据

### 文件大小

- 默认单文件上限：200 MiB
- 通过环境变量 `LIBRARY_MAX_FILE_SIZE_MB` 配置
- 总存储不设配额，通过磁盘空间监控提醒管理员

### 允许的文件类型（扩展名白名单）

第一版仅支持文档类型，后续按需扩展。

| 类别 | 扩展名 |
|---|---|
| PDF | `.pdf` |
| Word | `.doc` `.docx` |
| Excel | `.xls` `.xlsx` `.csv` |
| PowerPoint | `.ppt` `.pptx` |
| 文本 | `.txt` `.md` `.markdown` |
| 富文本 | `.rtf` |
| OpenDocument | `.odt` `.ods` `.odp` |

### 禁止的文件类型

所有不在白名单中的扩展名均被拒绝。特别禁止可执行文件和脚本类型：`exe` `msi` `bat` `cmd` `ps1` `js` `mjs` `html` `htm` `svg`（可内嵌脚本）。

### 下载安全

- 下载必须经过服务端权限校验
- 设置 `Content-Disposition: attachment`
- 设置 `X-Content-Type-Options: nosniff`
- **下载接口不接受 URL token**，只认 cookie（防止 token 泄露到日志/Referer）

### 事务补偿

- 文件写入成功后才能提交数据库记录
- 数据库失败时必须清理孤儿文件
- 保存时计算 SHA-256，用于完整性检查和辅助识别重复文件

## 7. 初始分类

**不预设种子数据。** 分类表创建后为空，由管理员自行创建和删除。数据模型支持树形结构（`parentId` 字段预留），第一版界面只支持一级分类。代码和测试不能依赖特定分类名称。

## 8. 部署配置变更

systemd 服务需新增以下写入路径：

```
ReadWritePaths=... /opt/hj-resource/storage /opt/hj-db-backup
```

环境变量：

```
HJ_DB_BACKUP_DIR=/opt/hj-db-backup
HJ_DB_BACKUP_REPO=https://github.com/yoush0uldknowme/HJ_DB_Backup.git
```

部署时需在服务器上预先初始化备份仓库（`git init` + 设置 remote + 配置 git 凭证）。

## 9. 遗留风险

1. **Git 历史中的旧备份** — `prisma/dev.db.backup.20260626_195320` 仍存在于 git 历史中。用户选择暂时不清理。
2. **服务器 git 凭证** — 自动备份需要服务器有 GitHub 推送权限，需在部署时配置 SSH key 或 PAT。
3. **校内服务器 IP** — 需确认固定 IP 或 DHCP 地址保留方式。
