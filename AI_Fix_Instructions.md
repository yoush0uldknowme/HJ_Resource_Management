# HJ_Resource_Management 修复指令（给 AI 用）

> 项目：Next.js 15 + React 19 + Prisma 6 + SQLite
> 分支：WorkBuddy_test
> 仓库：/workspace/HJ_Resource_Management
> 修复顺序：严格按编号执行，不要跳，每个修复完成后运行 `tsc --noEmit` 确认无编译错误

---

## FIX-01 ⚠️ 优先：同步数据库 Schema 和 init.sql

**问题：** `prisma/schema.prisma` 中 `OutboundRequest` 有 `quantity` 和 `executedCount` 字段，但 `prisma/init.sql` 中没有。

**修改 prisma/schema.prisma：**
在 `OutboundRequest` 模型中添加 `executedCount` 字段：
```prisma
model OutboundRequest {
  // ... 已有字段
  quantity       Int      @default(1)   // 已有
  executedCount  Int      @default(0)   // 新增：已出库数量
}
```

**修改 prisma/init.sql：**
在 `OutboundRequest` 表的 CREATE TABLE 语句中添加：
```sql
quantity INTEGER NOT NULL DEFAULT 1,
executed_count INTEGER NOT NULL DEFAULT 0,
```

---

## FIX-02 🔴 P0：修复出库执行逻辑 - 递减数量而非直接完成

**问题：** 审批后执行出库只处理 1 个电机就标记 `completed`，`quantity` 字段完全被忽略。

### 2a. 修改 `src/lib/request/actions.ts`

找到 `executeApprovedOutboundAction` 函数（约第 295-416 行），将执行出库的事务部分改为：

```typescript
// 原代码（约 380-393 行）：
// await prisma.$transaction([
//   prisma.motor.update({ where: { id: motor.id }, data: { status: next.motor.status, ... } }),
//   prisma.outboundRequest.updateMany({ where: { id: approvedRequest.id, status: "approved" }, data: { status: "completed" } })
// ]);

// 改为：
const newExecutedCount = approvedRequest.executedCount + 1;
const isFullyCompleted = newExecutedCount >= approvedRequest.quantity;

await prisma.$transaction([
  prisma.motor.update({
    where: { id: motor.id },
    data: { status: next.motor.status, ... }
  }),
  prisma.outboundRequest.update({
    where: { id: approvedRequest.id },
    data: {
      executedCount: newExecutedCount,
      status: isFullyCompleted ? "completed" : "approved",
      assignedMotorId: isFullyCompleted ? approvedRequest.assignedMotorId : null,
    }
  })
]);

// 创建日志时记录 executedCount
// 在 createLog 的参数中加上：executedCount: newExecutedCount
```

### 2b. 修改 `src/app/api/scan-execute/route.ts`

找到 `executeApproved` 模式的处理逻辑（约第 219-232 行），做同样的修改。

---

## FIX-03 🔴 P0：创建出库申请时加库存校验

**问题：** 不指定 `motorId` 时跳过所有校验，可以提交 `quantity=999`。

**修改 `src/lib/request/actions.ts`** 中 `createOutboundRequestAction`（约第 43-48 行）：

```typescript
// 在现有校验之后、创建记录之前，添加库存校验：
const inStockCount = await prisma.motor.count({
  where: { model: data.model, status: "in_stock" }
});

if (data.quantity > inStockCount) {
  redirect(`${returnPath}?error=insufficient_stock&available=${inStockCount}`);
}
```

同时检查 `batchCreateOutboundRequestAction` 是否也有同样问题并修复。

---

## FIX-04 🔴 P0：修复审批列表排序

**修改 `src/app/admin/requests/page.tsx`** 第 15 行：

```typescript
// 原：
// orderBy: [{ status: "asc" }, { createdAt: "desc" }]

// 改为：
orderBy: { createdAt: "desc" }
```

同时在渲染时，把 `pending` 状态的申请放在最前面展示（可在 JSX 中先 filter pending 再 filter 其他）。

---

## FIX-05 🔴 P0：审批时必须指定电机 + 执行时校验申请人身份

### 5a. 审批时必须指定电机
**修改 `src/lib/request/actions.ts`** 中 `approveOutboundRequestAction`（约第 223-240 行）：

```typescript
// 如果用户没有预选电机，管理员必须指定
if (!motorId && !request.assignedMotorId) {
  redirect(`${returnPath}?error=motor_required`);
}

// 如果管理员指定了电机，验证电机存在且在库
if (motorId) {
  const motor = await prisma.motor.findUnique({ where: { id: motorId } });
  if (!motor || motor.status !== "in_stock") {
    redirect(`${returnPath}?error=invalid_motor`);
  }
}
```

### 5b. 执行出库时校验申请人身份
**修改 `src/lib/request/actions.ts`** 中 `executeApprovedOutboundAction`（约第 296 行）：

```typescript
const user = await requireOperator();

// 新增：校验申请人身份
if (approvedRequest.requesterId !== user.id) {
  redirect(`${returnPath}?error=not_your_request`);
}
```

---

## FIX-06 🔴 P1：修复日志页面空指针崩溃

**修改 `src/app/logs/page.tsx`** 第 52 行附近：

```tsx
// 原：
// <Link href={`/motors/${log.motor.id}`}>{log.motor.motorCode}</Link>

// 改为：
{log.motor ? (
  <Link href={`/motors/${log.motor.id}`}>{log.motor.motorCode}</Link>
) : (
  <span className="text-gray-400">已删除</span>
)}
```

同样检查文件中所有 `log.motor.xxx` 的访问，全部加空值保护。

---

## FIX-07 🔴 P1：修复日志物理删除问题

### 7a. 逻辑删除替代物理删除
**修改 `src/lib/log/actions.ts`：**

`clearLogsAction` 和 `deleteLogAction` 改为逻辑删除：

```typescript
// 原：deleteMany({}) 或 deleteMany({ where: { id } })
// 改为：
await prisma.motorTransaction.updateMany({
  where: id ? { id } : {},
  data: { deleted: true, deletedAt: new Date() }
});
```

### 7b. 日志查询过滤已删除
**修改 `src/app/logs/page.tsx`** 查询，添加 `where: { deleted: false }`。

### 7c. Schema 添加 deleted 字段
在 `MotorTransaction` 模型添加：
```prisma
deleted    Boolean  @default(false)
deletedAt  DateTime?
```

### 7d. 电机删除改为 SET NULL
在 `MotorTransaction` 模型中，把 `motorId` 的外键约束从 `ON DELETE CASCADE` 改为 `ON DELETE SET NULL`。

---

## FIX-08 🔴 P1：修复摄像头双画面

**修改 `src/components/qr-scanner.tsx`：**

### 8a. 稳定 onScan 回调
```typescript
// 添加 ref 存储 onScan
const onScanRef = useRef(onScan);
onScanRef.current = onScan;

// start 改用空依赖 + ref
const start = useCallback(async () => {
  const elId = `qr-reader-${Date.now()}`; // 动态 ID 避免冲突
  const scanner = new Html5Qrcode(elId);
  // ...
  await scanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
    (text) => onScanRef.current?.(text),  // 用 ref
    () => {}
  );
}, []);  // 空依赖！
```

### 8b. useEffect 改用空依赖
```typescript
useEffect(() => {
  start();
  return () => {
    // 用 ref 标记已卸载，避免重复 stop
    stoppedRef.current = true;
  };
}, []);  // 空依赖，只执行一次
```

### 8c. doStop 加 await
```typescript
const doStop = useCallback(async () => {
  if (stoppedRef.current) return;
  stoppedRef.current = true;
  if (scannerRef.current) {
    try {
      await scannerRef.current.stop();
    } catch (e) {
      // 忽略 stop 错误（可能已经停了）
    }
  }
}, []);
```

---

## FIX-09 🔴 P1：移动端添加选择具体电机的功能

**修改 `src/app/mobile/outbound/page.tsx`：**

在型号选择后，查询该型号的在库电机列表，添加一个选择具体电机的 UI：

```typescript
// 查询可用电机
const motors = model ? await prisma.motor.findMany({
  where: { model, status: "in_stock" },
  orderBy: { motorCode: "asc" }
}) : [];

// 表单中添加 motorId 字段
<input type="hidden" name="motorId" value={selectedMotorId} />
// 或用 select 让用户选择
```

注意：如果用户选择"不指定（让管理员分配）"，motorId 可以为空，但要保持与桌面端行为一致。

---

## FIX-10 🟡 P2：桌面端添加数量字段

**修改 `src/app/motors/outbound/page.tsx`** 第 111-153 行的表单：

```tsx
{/* 添加数量输入 */}
<div>
  <label htmlFor="quantity">数量</label>
  <input
    id="quantity"
    name="quantity"
    type="number"
    min="1"
    max="99"
    defaultValue="1"
    required
  />
</div>
```

---

## FIX-11 🟡 P2：修复摄像头倒置

**修改 `src/components/qr-scanner.tsx` 和 `src/components/continuous-scanner.tsx`：**

在 CSS 中添加：
```css
#qr-reader video,
#continuous-qr-reader video {
  object-fit: cover;
  transform: scaleX(-1); /* 后置摄像头镜像翻转 */
}
```

或者在 JS 中检测设备方向并动态设置 transform。

---

## FIX-12 🟡 P2：修复 Middleware API 路由认证

**修改 `src/middleware.ts`** 第 38-40 行：

```typescript
// 原：
// matcher: "/((?!_next|api|login).*)"

// 改为（不排除 api 路由）：
matcher: "/((?!_next|login).*)"
```

或者在 `api/events/requests/route.ts` 和 `api/scan-execute/route.ts` 中添加从 `x-hj-token` 请求头读取 token 的 fallback 逻辑。

---

## FIX-13 🟡 P2：SSE 断线重连

**修改 `src/components/admin-notifier.tsx`** 第 114-120 行：

```typescript
eventSource.onerror = () => {
  eventSource.close();
  // 5 秒后重连
  setTimeout(() => {
    const newSource = new EventSource("/api/events/requests");
    // 复用现有的 onmessage 和 onerror 逻辑
    newSource.onmessage = eventSource.onmessage;
    newSource.onerror = eventSource.onerror;
    eventSourceRef.current = newSource;
  }, 5000);
};
```

---

## FIX-14 🟢 P3：统一编码格式

### 14a. 修改提示文案
**`src/components/scan-code-field.tsx`** 和 **`src/app/motors/new/page.tsx`**：
把所有 "八位数字编号" 和 "60200001" 改为 "电机编号（如 GM6020-0001）"。

### 14b. 对齐编码格式
如果确定用 `GM6020-0001` 格式，确保 `src/lib/motor/code.ts` 中的 `buildMotorCode` 和所有提示文案一致。

---

## FIX-15 🟢 P3：批量操作加事务

**修改 `src/lib/motor/actions.ts`** 中的批量入库（约第 409 行）和批量出库（约第 513 行）：

```typescript
// 原：for...of 逐条执行
// 改为：
await prisma.$transaction(
  items.map(item => prisma.motor.update({ ... }))
);
```

注意：`$transaction` 的交互式 API 和数组 API 不同，批量操作用数组形式。

---

## 每完成一个 FIX 后的验证步骤

```bash
# 1. 类型检查
npx tsc --noEmit

# 2. 运行测试（如果有）
npx vitest run

# 3. 启动开发服务器验证
npm run dev
```

## 修复顺序建议

1. **FIX-01**（Schema 同步）→ 这是基础
2. **FIX-02 + FIX-03**（出库逻辑）→ 核心业务
3. **FIX-04 + FIX-05**（审批流程）→ 核心业务
4. **FIX-06 + FIX-07**（日志修复）→ 稳定性
5. **FIX-08 + FIX-11**（摄像头）→ 体验
6. **FIX-09 + FIX-10**（移动/桌面同步）→ 功能对齐
7. **FIX-12**（认证）→ 安全
8. **FIX-13**（SSE）→ 体验
9. **FIX-14 + FIX-15**（优化）→ 收尾

每个 FIX 之间建议提交一次 git commit，方便回滚。
