# HJ_Resource_Management 代码审查与问题分析报告

> 分析分支：`WorkBuddy_test` | 技术栈：Next.js 15 + React 19 + Prisma 6 + SQLite

---

## 一、项目整体评估

### 1.1 架构概览

项目是一个**电机柜资源管理系统**，功能涵盖电机入库、出库、审批、扫码、标签打印。目前代码规模约 70+ 个源文件。

**核心判断：这是一个原型/试点阶段的半成品**，虽然代码量不少，但存在大量**逻辑断层**——功能有入口但链路不完整、有表单但数据不传递、有审批但执行不校验。整体感觉像是多个开发者在不同时间段各自添加功能，没有统一的设计规范和流程闭环。

### 1.2 技术栈问题

| 问题 | 说明 |
|------|------|
| 文档与代码脱节 | 实施文档描述的是 Vue 3 + FastAPI，实际用 Next.js + React |
| 编码格式三处不一致 | `motor-code.ts` 生成 `GM6020-0001`，UI 提示"八位编号 60200001"，文档建议 `MTR-YYYYMM-XXXX` |
| Prisma Schema 与 init.sql 不同步 | `OutboundRequest.quantity` 在 schema 中有但 init.sql 无 |

---

## 二、用户反馈的 9 个问题精确分析

### 问题 A：日志系统崩溃 + 操作日志异常

| 严重程度 | 🔴 高 |
|----------|------|

**崩溃原因（3 个独立问题）：**

#### A1. 空指针崩溃
**文件：** `src/app/logs/page.tsx:10-14, 52`

```tsx
// 第 10-14 行：查询日志并关联电机
const logs = await prisma.motorTransaction.findMany({
  include: { motor: true },  // ⚠️ 假设 motor 一定存在
  ...
});

// 第 52 行：直接访问 motor 属性
<Link href={`/motors/${log.motor.id}`}>{log.motor.motorCode}</Link>
// ⚠️ 如果 motor 为 null，访问 .motorCode 会抛出 TypeError
```

**触发条件：** 当电机的 `motorId` 外键指向不存在的记录时（如通过 SQL 直接操作数据库、或级联删除未正确执行），`log.motor` 为 null，整个页面渲染崩溃。

#### A2. 物理删除日志
**文件：** `src/lib/log/actions.ts:16-20`

```typescript
export async function clearLogsAction() {
  await requireAdmin();
  await prisma.motorTransaction.deleteMany({});  // ⚠️ 物理删除全部，不可逆
  revalidatePath("/logs");
}
```

**文档要求（`资源管理系统项目总计划与需求清单.md` 第 356 行）：**
> "关键操作日志仅允许逻辑隐藏，不允许物理删除"

代码完全相反——不仅支持单条物理删除（`deleteLogAction`），还支持一键清空。

#### A3. 删除电机级联删除日志
**文件：** `src/lib/motor/actions.ts:148-157`

```typescript
await prisma.motor.delete({ where: { id: motorId } });
// ⚠️ Prisma schema 中 MotorTransaction.motorId 有 ON DELETE CASCADE
// 删除电机会级联删除所有关联日志
```

**修复建议：**
1. 日志页面加空值保护：`log.motor?.motorCode ?? "已删除"`
2. 将 `clearLogsAction` 改为逻辑删除（添加 `deleted` 字段）
3. 将 `ON DELETE CASCADE` 改为 `ON DELETE SET NULL`，保留日志

---

### 问题 B：审批信息最新的不在最上面

| 严重程度 | 🔴 高 |
|----------|------|

**文件：** `src/app/admin/requests/page.tsx:15`

```typescript
orderBy: [{ status: "asc" }, { createdAt: "desc" }]
```

**status 字符串升序排列结果：**
1. `approved` （已批准）← 最先显示
2. `completed`（已完成）
3. `pending` （待审批）← 应该最先显示的排第三
4. `rejected` （已拒绝）

管理员打开审批页面，看到的顺序是"已批准 → 已完成 → 待审批 → 已拒绝"，最新的待审批请求被压在后面。

**修复建议：**
```typescript
// 方案1：只用时间排序
orderBy: { createdAt: "desc" }

// 方案2：pending 优先，其余按时间
orderBy: [
  { status: "desc" },  // pending > completed > approved > rejected（仍不完美）
  { createdAt: "desc" }
]
```

---

### 问题 C：入库出库时摄像头有两个一样画面

| 严重程度 | 🔴 高 |
|----------|------|

**文件：** `src/components/qr-scanner.tsx:64-81`

```typescript
// 第 64 行：start 依赖 onScan
const start = useCallback(async () => {
  const scanner = new Html5Qrcode("qr-reader");  // 固定 ID
  await scanner.start(...);
}, [onScan]);

// 第 73-81 行：useEffect 依赖 start
useEffect(() => {
  start();
  return () => {
    if (!stoppedRef.current) doStop();  // doStop 是异步的，没有 await！
  };
}, [start, doStop]);
```

**双画面产生机制：**

1. 父组件 `mobile-scan-button.tsx:41-49` 传入的 `onScan` 是内联箭头函数，**每次父组件渲染都是新引用**
2. 新引用 → `start` 重建 → `useEffect` 重新执行
3. cleanup 中调用 `doStop()`（异步，**没有 await**）
4. 紧接着 `start()` 创建新 `Html5Qrcode("qr-reader")` 实例并启动摄像头
5. 旧 `stop()` 还没完成，新摄像头已启动 → **两个画面并存**
6. 两个实例都绑定到 DOM ID `qr-reader`，争抢同一个 div

**修复建议：**
1. `useEffect` 改用空依赖数组 `[]`（参考 `continuous-scanner.tsx` 的做法）
2. `doStop()` 加 `await` 确保完全停止后再启动
3. 用 `useRef` 稳定 `onScan` 回调引用
4. 使用动态 ID 避免多实例冲突

---

### 问题 D：摄像头有概率倒置

| 严重程度 | 🟡 中 |
|----------|------|

**文件：** `src/components/qr-scanner.tsx:44-46` 和 `src/components/continuous-scanner.tsx:183-185`

```typescript
await scanner.start(
  { facingMode: "environment" },  // 只有 facingMode，没有方向约束
  { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
  ...
)
```

**问题分析：**
1. `html5-qrcode` 底层用 `getUserMedia`，不自动处理 video 元素的 CSS 旋转变换
2. `aspectRatio: 1` 强制正方形，手机摄像头原生是 4:3 或 16:9，强制裁剪可能导致画面拉伸
3. 没有监听 `screen.orientation` 变化
4. 部分 Android 浏览器（尤其微信内置浏览器）返回的视频流带有错误旋转元数据

**修复建议：**
1. CSS 加 `object-fit: cover` 和 `transform` 适配
2. 添加方向检测和动态旋转
3. 设置 `videoConstraints` 的 `width`/`height` 理想值

---

### 问题 E：手机端无法选择具体出库电机，电脑端可以

| 严重程度 | 🔴 高 |
|----------|------|

这是**移动端和桌面端设计不一致**的核心问题。

| 对比维度 | 桌面端 `motors/outbound/page.tsx` | 移动端 `mobile/outbound/page.tsx` |
|----------|----------------------------------|-----------------------------------|
| 查询电机 | `findMany({ model, status: "in_stock" })` | 只 `groupBy` 型号 |
| 选择具体电机 | Radio 按钮列表 | **无** |
| 表单字段 | 型号 + 具体电机 + 领用人 + 去向 | 型号 + 数量 + 领用人 + 去向 |
| 能否指定电机 | ✅ 可以 | ❌ 不可以 |

**移动端代码（第 58-100 行）：**
```tsx
<form action={createOutboundRequestAction}>
  <input type="hidden" name="returnPath" value="/mobile/requests" />
  <select name="model">...</select>      {/* 只有型号 */}
  <input name="quantity" type="number" />
  <input name="recipient" />
  <input name="location" />
  {/* ⚠️ 没有 motorId 字段！无法选择具体电机 */}
</form>
```

**后果：** 手机用户只能提交型号+数量，管理员审批时再分配具体电机。如果管理员不指定，任何同型号电机都能被出库。

**修复建议：** 移动端添加"选择具体电机"的下拉列表或列表选择器，与桌面端保持一致。

---

### 问题 F：电脑端不能填数量

| 严重程度 | 🟡 中 |
|----------|------|

**文件：** `src/app/motors/outbound/page.tsx:111-153`

桌面端普通用户出库申请表单：
```tsx
<form action={createOutboundRequestAction}>
  <input type="hidden" name="model" value={effectiveModel} />
  {/* 选择具体电机 radio */}
  <input name="recipient" />
  <input name="location" />
  {/* ⚠️ 没有 quantity 字段！ */}
</form>
```

表单没有 `quantity` 输入框，`createOutboundRequestAction` 的 Zod schema 中 `quantity` 有 `.default(1)`，所以永远只能申请 1 台。

**修复建议：** 添加数量输入框 `<input name="quantity" type="number" min="1" />`

---

### 问题 G：手机填了数量也不行

| 严重程度 | 🔴🔴 严重 |
|----------|----------|

**涉及 3 个文件，问题链条：**

#### G1. 审批执行时忽略 quantity
**文件：** `src/lib/request/actions.ts:380-393`

```typescript
await prisma.$transaction([
  prisma.motor.update({
    where: { id: motor.id },  // 只更新 1 个电机
    data: { status: next.motor.status, ... }
  }),
  prisma.outboundRequest.updateMany({
    where: { id: approvedRequest.id, status: "approved" },
    data: { status: "completed" }  // 直接标记完成！
  })
]);
```

**问题：** 申请 quantity=5，出库 1 台就标记完成，剩余 4 台永远无法出库。

#### G2. 扫码执行同样忽略 quantity
**文件：** `src/app/api/scan-execute/route.ts:219-232`

与 G1 完全相同的逻辑——只出库 1 台就标记申请为 `completed`。

#### G3. 扫码 API 的 request 模式硬编码 quantity=1
**文件：** `src/app/api/scan-execute/route.ts:148-158`

```typescript
const request = await createOutboundRequest({
  model: motor.model,
  quantity: 1,  // ⚠️ 硬编码为 1
  ...
});
```

**修复建议：**
1. 出库执行后不直接标记 `completed`，而是递减 `quantity` 或增加 `executedCount`
2. 当 `executedCount >= quantity` 时才标记 `completed`
3. Schema 添加 `executedCount` 字段

---

### 问题 H：只能审批一个，然后就乱了

| 严重程度 | 🔴🔴 严重 |
|----------|----------|

这是**多个问题叠加**导致的体验灾难：

#### H1. 排序混乱（同问题 B）
审批列表排序错误，待审批不在最上面，审批了一个后找不到下一个。

#### H2. 审批不指定电机导致链路断裂
**文件：** `src/lib/request/actions.ts:223-240`

```typescript
// 管理员审批时不指定电机
if (motorId) {
  // 验证并指定
} else if (request.assignedMotorId) {
  // 用户预选了电机
}
// 都没指定 → assignedMotorId 保持 null
```

审批后 `assignedMotorId` 为 null，任何同型号在库电机都能被扫码出库。

#### H3. 移动端入口矛盾
**文件：** `src/app/mobile/requests/page.tsx:45`

```typescript
{request.status === "approved" && request.assignedMotor ? (
  <button>扫码出库</button>  // 只有指定了电机才显示
) : null}
```

审批不指定电机 → 用户在"我的申请"页看不到扫码入口。

但 `src/app/mobile/scan/page.tsx:116-123` 又允许任何人扫码执行已审批申请。

**结果：** 用户在"我的申请"找不到入口，去"扫码"页却可以执行，体验完全断裂。

#### H4. 执行出库不检查申请人身份
**文件：** `src/lib/request/actions.ts:296`

```typescript
const user = await requireOperator();  // 只检查是操作员
// ⚠️ 不检查 user.id === approvedRequest.requesterId
```

任何操作员都能执行任何人的已审批申请，造成出库混乱。

**修复建议：**
1. 修复排序（同问题 B）
2. 审批时必须指定电机或要求用户预选
3. 统一移动端入口：未指定电机时也在申请列表显示"待管理员分配"状态
4. 执行出库时校验申请人身份

---

### 问题 I：手机填了就可以无限制出库

| 严重程度 | 🔴🔴 严重 |
|----------|----------|

**完整攻击链：**

#### I1. 创建申请无库存校验
**文件：** `src/lib/request/actions.ts:43-48`

```typescript
if (data.motorId) {
  // 指定了电机 → 有校验
  const motor = await prisma.motor.findUnique({ where: { id: data.motorId } });
  if (!motor || motor.model !== data.model || motor.status !== "in_stock") {
    redirect(`${returnPath}?error=invalid_motor`);
  }
}
// ⚠️ 不指定 motorId → 零校验，可以提交 quantity=999
```

移动端用户无法指定 motorId（问题 E），走的是无校验路径。

#### I2. 审批后执行不递减数量（同问题 G）
申请 quantity=99，出库 1 台就标记完成。

#### I3. 扫码页面全局可执行
**文件：** `src/app/mobile/scan/page.tsx:31-39`

```typescript
// 任何操作员扫码任意在库电机
// 只要该电机或同型号有已审批申请 → 可执行出库
approvedRequest = await prisma.outboundRequest.findFirst({
  where: { model: motor.model, assignedMotorId: null, status: "approved" }
});
```

**无限制出库完整流程：**
1. 手机端填 quantity=99 → 提交（无库存校验）
2. 管理员审批 → 状态变为 approved
3. 扫码任意同型号电机 → 出库 1 台 → 申请变 completed
4. 重复步骤 1-3 无数次 → 只要有 1 台库存就能无限出库

**修复建议：**
1. 创建申请时加库存校验：`quantity <= 同型号在库数量`
2. 审批时锁定对应数量库存（或引入"已分配"状态）
3. 执行出库后递减 quantity，不等于 0 时保持 approved 状态

---

## 三、额外发现的全局性问题

### 3.1 Schema 与 init.sql 不一致 🔴 严重

| 文件 | OutboundRequest.quantity |
|------|--------------------------|
| `prisma/schema.prisma:46` | `quantity Int @default(1)` ✅ 存在 |
| `prisma/init.sql:57-73` | ❌ 没有 quantity 列 |

**后果：** 如果通过 `npm run db:init`（即执行 init.sql）初始化数据库，所有 Prisma 的 quantity 操作都会报错 `no such column: quantity`。

### 3.2 Middleware 排除 API 路由导致认证失效 🔴 高

**文件：** `src/middleware.ts:38-40`

```typescript
matcher: "/((?!_next|api|login).*)"  // ⚠️ 排除了 /api/* 路由
```

middleware 负责从 URL 参数中提取 token 并设置 cookie。API 路由被排除后：
- SSE 通知 API (`/api/events/requests`) 手机端 cookie 失效时返回 401
- 扫码执行 API (`/api/scan-execute`) 手机端同样认证失败
- 这两个 API 只从 cookie 读取 token，没有 URL token fallback

### 3.3 SSE 断开后不重连 🟡 中

**文件：** `src/components/admin-notifier.tsx:114-120`

```typescript
eventSource.onerror = () => {
  eventSource.close();
  setTimeout(() => {
    // ⚠️ 注释：TODO: reconnect
  }, 5000);
};
```

SSE 连接断开后，管理员收不到新的审批通知，需要手动刷新页面。

### 3.4 编码格式全链路不一致 🟡 中

| 位置 | 格式 | 示例 |
|------|------|------|
| `src/lib/motor/code.ts` | `GM6020-0001` | 实际生成的编码 |
| `src/components/scan-code-field.tsx` | 八位数字 | 提示"60200001" |
| `src/app/motors/new/page.tsx` | 八位数字 | 提示"60200001" |
| 实施方案文档 | `MTR-YYYYMM-XXXX` | 文档建议格式 |

**后果：** 用户看到提示"输入八位数字编号"，但实际编码是 `GM6020-0001`，扫码和手动输入都会困惑。

### 3.5 批量操作无事务保护 🟡 中

**文件：** `src/lib/motor/actions.ts:409, 513`

批量入库/出库用 `for...of` 循环逐条执行，没有事务包裹。部分成功时已执行的操作无法回滚。

---

## 四、问题优先级汇总

| 优先级 | 编号 | 问题 | 影响 | 建议修复时间 |
|--------|------|------|------|-------------|
| P0 | I | 无限制出库 | 库存管理完全失效 | 立即 |
| P0 | G | 数量字段无效 | 出库数量无法控制 | 立即 |
| P0 | H | 审批流程混乱 | 业务流程无法正常运转 | 立即 |
| P1 | A | 日志系统崩溃 | 审计追溯失效 | 1-2 天 |
| P1 | B | 审批排序错误 | 管理员操作效率低 | 1 天 |
| P1 | C | 摄像头双画面 | 扫码功能基本不可用 | 1-2 天 |
| P1 | E | 移动端不能选电机 | 移动端出库流程断裂 | 1-2 天 |
| P2 | F | 桌面端不能填数量 | 桌面端体验不完整 | 1 天 |
| P2 | D | 摄像头倒置 | 部分设备扫码困难 | 1 天 |
| P2 | 3.1 | Schema 与 SQL 不同步 | 新环境部署失败 | 1 天 |
| P2 | 3.2 | API 认证失效 | 移动端 API 功能不可用 | 1 天 |
| P3 | 3.3 | SSE 不重连 | 管理员收不到实时通知 | 后续迭代 |
| P3 | 3.4 | 编码格式不一致 | 用户困惑 | 后续迭代 |
| P3 | 3.5 | 批量无事务 | 极端情况下数据不一致 | 后续迭代 |

---

## 五、架构层面的核心问题

### 5.1 移动端与桌面端是两套独立实现

移动端和桌面端的入库、出库、电机列表等功能没有共享业务逻辑组件，各自独立实现。这导致：
- 功能不同步（桌面能选电机，移动不能）
- Bug 不共享（桌面不能填数量，移动可以填但无效）
- 修复成本翻倍

**建议：** 将核心业务表单抽取为共享组件，移动端和桌面端只负责布局适配。

### 5.2 出库流程缺乏状态机设计

出库应该是一个完整的状态流转：

```
申请 → 审批 → 分配电机 → 扫码执行 → (递减数量) → 完成/部分完成
```

当前代码跳过了"递减数量"和"部分完成"两个状态，导致流程在审批后就失控。

### 5.3 权限校验粒度不够

- 执行出库不校验申请人身份
- 扫码页面不校验操作权限
- 批量操作不校验单次操作权限

### 5.4 数据一致性保障不足

- 库存数量靠 `status: "in_stock"` 统计，没有实际的库存计数
- 出库申请没有锁定库存（乐观锁或悲观锁）
- 批量操作没有事务

---

## 六、修复路线图建议

### 第一阶段：止血（P0，1-3 天）
1. 修复出库执行逻辑，引入 `executedCount` 字段，递减数量
2. 创建申请时加库存校验
3. 统一审批流程：审批必须指定电机，执行校验申请人身份
4. 修复审批列表排序

### 第二阶段：修复体验（P1，3-7 天）
1. 修复摄像头双画面和倒置问题
2. 移动端添加电机选择功能
3. 修复日志崩溃和物理删除问题
4. 修复 middleware API 路由认证
5. 统一 schema 和 init.sql

### 第三阶段：架构优化（P2-P3，后续迭代）
1. 抽取共享业务组件
2. 引入出库状态机
3. 添加事务保护
4. SSE 重连机制
5. 统一编码格式
6. 统一文案提示

---

> **报告生成时间：** 2026-06-23 | **分析分支：** WorkBuddy_test | **分析范围：** 71 个源文件
