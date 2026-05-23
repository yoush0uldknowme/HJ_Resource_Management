# Complete Demo Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete demo loop where desktop users create motors and print labels, while mobile users scan or enter codes to query, inbound, and outbound motors with clear feedback.

**Architecture:** Keep the current Next.js App Router and Prisma SQLite monolith. Add small shared helpers for motor lookup, result messages, and label rendering, then layer desktop and mobile pages on top without changing the database schema.

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, Prisma, SQLite, QRCode, custom Code128 renderer, Vitest, TypeScript.

---

## File Structure

- Modify `src/lib/status.ts`: fix Chinese labels and add status tone helpers if needed.
- Modify `src/lib/motor-flow.ts`: keep state transition logic focused and add user-facing failure reasons through typed errors.
- Modify `src/lib/motor-flow.test.ts`: cover inbound/outbound status behavior and blocked outbound messages.
- Modify `src/lib/actions/motors.ts`: replace raw thrown lookup errors with redirectable result handling and shared lookup helpers.
- Create `src/lib/motor-lookup.ts`: normalize scanned codes and find motors by `motorCode` or `snCode`.
- Create `src/lib/action-result.ts`: encode/decode result query strings for success and error result pages.
- Modify `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/motors/page.tsx`, `src/app/motors/new/page.tsx`, `src/app/motors/[id]/page.tsx`, `src/app/motors/inbound/page.tsx`, `src/app/motors/outbound/page.tsx`, `src/app/logs/page.tsx`: repair all visible Chinese text.
- Create `src/app/motors/[id]/label/page.tsx`: desktop label print page.
- Create `src/app/mobile/page.tsx`: mobile field-operation entry.
- Create `src/app/mobile/scan/page.tsx`: mobile query page.
- Create `src/app/mobile/inbound/page.tsx`: mobile inbound page.
- Create `src/app/mobile/outbound/page.tsx`: mobile outbound page.
- Create `src/components/result-panel.tsx`: shared success/error result component.
- Create `src/components/motor-summary.tsx`: compact motor summary used by mobile result pages.
- Create `src/components/scan-code-field.tsx`: mobile-friendly code input with camera placeholder and manual fallback.
- Modify `src/app/globals.css`: add mobile workflow, result, label, and print styles.
- Modify `README.md`, `docs/project-progress.md`, `docs/final-motor-pilot-target.md`: repair key documentation and align it with the complete demo loop.

## Task 1: Repair Core Labels and Flow Tests

**Files:**
- Modify: `src/lib/status.ts`
- Modify: `src/lib/motor-flow.ts`
- Modify: `src/lib/motor-flow.test.ts`

- [ ] **Step 1: Replace status and transaction labels**

Update `src/lib/status.ts` to:

```ts
export const MOTOR_STATUS_LABEL: Record<string, string> = {
  draft: "待入库",
  in_stock: "在库",
  checked_out: "已领用",
  repairing: "维修中",
  retired: "已报废"
};

export const TRANSACTION_LABEL: Record<string, string> = {
  create: "建档",
  inbound: "入库",
  outbound: "出库"
};

export function motorStatusLabel(status: string): string {
  return MOTOR_STATUS_LABEL[status] ?? status;
}

export function transactionLabel(type: string): string {
  return TRANSACTION_LABEL[type] ?? type;
}
```

- [ ] **Step 2: Normalize flow messages**

Update `src/lib/motor-flow.ts` so inbound uses `"在库"` and default remark `"扫码直接入库"`, while outbound still rejects non-stock motors:

```ts
export class MotorFlowError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}
```

Change the outbound rejection to:

```ts
throw new MotorFlowError("只有在库电机可以出库", "OUTBOUND_NOT_IN_STOCK");
```

- [ ] **Step 3: Update flow tests**

Replace mojibake expectations in `src/lib/motor-flow.test.ts` with readable Chinese:

```ts
expect(result.motor).toEqual({ status: "in_stock", currentLocation: "在库" });
expect(result.transaction).toMatchObject({
  transactionType: "inbound",
  operator: "admin",
  location: "在库",
  remark: "扫码直接入库"
});
```

For outbound use:

```ts
{ operator: "admin", issuedBy: "张三", vehicle: "英雄车" }
```

And expect the rejected outbound error:

```ts
expect(() =>
  applyOutbound(
    { status: "checked_out", currentLocation: "Lab 2" },
    { operator: "admin", issuedBy: "张三", vehicle: "英雄车" }
  )
).toThrow("只有在库电机可以出库");
```

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/lib/motor-flow.test.ts`

Expected: motor-flow tests pass.

## Task 2: Add Lookup and Result Helpers

**Files:**
- Create: `src/lib/motor-lookup.ts`
- Create: `src/lib/action-result.ts`
- Test: `src/lib/action-result.test.ts`

- [ ] **Step 1: Create result helper tests**

Create `src/lib/action-result.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { decodeActionResult, encodeActionResult } from "./action-result";

describe("action result query helpers", () => {
  it("round trips success result fields", () => {
    const query = encodeActionResult({
      type: "success",
      title: "入库成功",
      message: "GM6020-0001 已入库",
      motorId: 1,
      motorCode: "GM6020-0001"
    });

    expect(decodeActionResult(new URLSearchParams(query))).toEqual({
      type: "success",
      title: "入库成功",
      message: "GM6020-0001 已入库",
      motorId: 1,
      motorCode: "GM6020-0001"
    });
  });

  it("returns null when no result type exists", () => {
    expect(decodeActionResult(new URLSearchParams())).toBeNull();
  });
});
```

- [ ] **Step 2: Implement result helpers**

Create `src/lib/action-result.ts`:

```ts
export type ActionResultType = "success" | "error";

export type ActionResult = {
  type: ActionResultType;
  title: string;
  message: string;
  motorId?: number;
  motorCode?: string;
};

export function encodeActionResult(result: ActionResult): string {
  const params = new URLSearchParams();
  params.set("type", result.type);
  params.set("title", result.title);
  params.set("message", result.message);
  if (result.motorId) params.set("motorId", String(result.motorId));
  if (result.motorCode) params.set("motorCode", result.motorCode);
  return params.toString();
}

export function decodeActionResult(params: URLSearchParams): ActionResult | null {
  const type = params.get("type");
  const title = params.get("title");
  const message = params.get("message");
  if (type !== "success" && type !== "error") return null;
  if (!title || !message) return null;

  const motorIdText = params.get("motorId");
  return {
    type,
    title,
    message,
    motorId: motorIdText ? Number(motorIdText) : undefined,
    motorCode: params.get("motorCode") ?? undefined
  };
}
```

- [ ] **Step 3: Implement motor lookup helper**

Create `src/lib/motor-lookup.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

export function normalizeScannedCode(value: FormDataEntryValue | null | undefined): string {
  return String(value ?? "").trim();
}

export async function findMotorByScannedCode(
  prisma: PrismaClient,
  scannedCode: string
) {
  const code = scannedCode.trim();
  if (!code) return null;

  return prisma.motor.findFirst({
    where: {
      OR: [{ motorCode: code }, { snCode: code }]
    },
    include: {
      photos: {
        where: { photoType: "archive" },
        orderBy: { uploadedAt: "desc" },
        take: 1
      }
    }
  });
}
```

- [ ] **Step 4: Run helper tests**

Run: `npm test -- src/lib/action-result.test.ts src/lib/motor-code.test.ts`

Expected: tests pass.

## Task 3: Repair Desktop Text and Navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/motors/page.tsx`
- Modify: `src/app/motors/new/page.tsx`
- Modify: `src/app/motors/[id]/page.tsx`
- Modify: `src/app/logs/page.tsx`
- Modify: `src/components/copy-button.tsx`

- [ ] **Step 1: Replace visible mojibake text**

Use readable Chinese for page titles, sidebar navigation, labels, table headers, empty states, and buttons. Preserve the existing data fetching logic.

Required sidebar labels:

```tsx
<strong>HJ 资源管理</strong>
<span>电机试点 Demo</span>
<Link href="/">首页概览</Link>
<Link href="/motors">电机列表</Link>
<Link href="/motors/new">新建电机</Link>
<Link href="/motors/inbound">入库</Link>
<Link href="/motors/outbound">出库</Link>
<Link href="/mobile">手机端入口</Link>
<Link href="/logs">操作记录</Link>
```

Required copy button text:

```tsx
{copied ? "已复制" : "复制编码"}
```

- [ ] **Step 2: Add label page link on detail page**

In `src/app/motors/[id]/page.tsx`, add:

```tsx
<Link className="button secondary" href={`/motors/${motor.id}/label`}>
  打印标签
</Link>
```

- [ ] **Step 3: Run type check**

Run: `npm run lint`

Expected: TypeScript passes.

## Task 4: Add Desktop Label Print Page

**Files:**
- Create: `src/app/motors/[id]/label/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create label page**

Create `src/app/motors/[id]/label/page.tsx` with server-side motor lookup, QRCode generation, Code128 rendering, and buttons for back/detail/print:

```tsx
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { renderCode128Svg } from "@/lib/code128";
import { prisma } from "@/lib/db";

export default async function MotorLabelPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCurrentUser();
  const { id } = await params;
  const motor = await prisma.motor.findUnique({ where: { id: Number(id) } });
  if (!motor) notFound();

  const qr = await QRCode.toDataURL(motor.motorCode, { margin: 1, width: 220 });
  const code128Svg = renderCode128Svg(motor.motorCode);

  return (
    <>
      <div className="page-head print-hidden">
        <div>
          <h1>打印标签</h1>
          <p>打印或复制编码到本地打标软件，标签内容为内部编码。</p>
        </div>
        <div className="toolbar">
          <Link className="button secondary" href={`/motors/${motor.id}`}>返回详情</Link>
          <button className="button" type="button" onClick={() => window.print()}>打印</button>
        </div>
      </div>
      <section className="label-sheet">
        <div className="print-label">
          <div className="label-title">{motor.model}</div>
          <div className="label-code">{motor.motorCode}</div>
          <Image src={qr} alt={`${motor.motorCode} QR`} width={130} height={130} unoptimized />
          <div className="barcode-preview" dangerouslySetInnerHTML={{ __html: code128Svg }} />
        </div>
      </section>
    </>
  );
}
```

If the inline print button cannot compile in a Server Component, replace it with a small client component `src/components/print-button.tsx`.

- [ ] **Step 2: Add print styles**

Add CSS classes:

```css
.label-sheet {
  display: grid;
  place-items: start;
  gap: 16px;
}

.print-label {
  width: 280px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  text-align: center;
}

.label-title {
  font-weight: 700;
  font-size: 18px;
}

.label-code {
  margin: 6px 0 10px;
  font-size: 16px;
  font-weight: 700;
}

@media print {
  body {
    background: #fff;
  }

  .sidebar,
  .print-hidden {
    display: none !important;
  }

  .app-shell {
    display: block;
  }

  .content {
    padding: 0;
  }

  .print-label {
    border: 1px solid #000;
    page-break-inside: avoid;
  }
}
```

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: build passes. If Server Component event handler fails, add the `PrintButton` client component and rebuild.

## Task 5: Improve Desktop Inbound and Outbound Feedback

**Files:**
- Modify: `src/lib/actions/motors.ts`
- Modify: `src/app/motors/inbound/page.tsx`
- Modify: `src/app/motors/outbound/page.tsx`
- Create: `src/components/result-panel.tsx`

- [ ] **Step 1: Create result component**

Create `src/components/result-panel.tsx`:

```tsx
import Link from "next/link";
import type { ActionResult } from "@/lib/action-result";

export function ResultPanel({ result }: { result: ActionResult | null }) {
  if (!result) return null;

  return (
    <section className={`result-panel ${result.type}`}>
      <h2>{result.title}</h2>
      <p>{result.message}</p>
      <div className="toolbar">
        {result.motorId ? (
          <Link className="button secondary" href={`/motors/${result.motorId}`}>
            查看详情
          </Link>
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Update actions to redirect with result query**

In `src/lib/actions/motors.ts`, import helpers:

```ts
import { encodeActionResult } from "@/lib/action-result";
import { findMotorByScannedCode, normalizeScannedCode } from "@/lib/motor-lookup";
import { MotorFlowError } from "@/lib/motor-flow";
```

Use a local helper:

```ts
function resultUrl(pathname: string, result: Parameters<typeof encodeActionResult>[0]) {
  return `${pathname}?${encodeActionResult(result)}`;
}
```

For inbound, when code is empty or missing:

```ts
redirect(resultUrl("/motors/inbound", {
  type: "error",
  title: "入库失败",
  message: "请先扫码或输入电机编码。"
}));
```

When motor is not found:

```ts
redirect(resultUrl("/motors/inbound", {
  type: "error",
  title: "未找到电机",
  message: `没有找到编码为 ${scannedCode} 的电机。`
}));
```

After success:

```ts
redirect(resultUrl("/motors/inbound", {
  type: "success",
  title: "入库成功",
  message: `${motor.motorCode} 已入库。`,
  motorId: motor.id,
  motorCode: motor.motorCode
}));
```

Apply the same pattern for outbound, with the success message including出库人 and车辆.

- [ ] **Step 3: Decode result on pages**

In inbound and outbound pages, read:

```ts
import { decodeActionResult } from "@/lib/action-result";
import { ResultPanel } from "@/components/result-panel";
```

Update page signature to accept `searchParams`, decode result, and render:

```tsx
const params = await searchParams;
const result = decodeActionResult(new URLSearchParams(params));
<ResultPanel result={result} />
```

- [ ] **Step 4: Run type check**

Run: `npm run lint`

Expected: TypeScript passes.

## Task 6: Add Mobile Demo Pages

**Files:**
- Create: `src/app/mobile/page.tsx`
- Create: `src/app/mobile/scan/page.tsx`
- Create: `src/app/mobile/inbound/page.tsx`
- Create: `src/app/mobile/outbound/page.tsx`
- Create: `src/components/motor-summary.tsx`
- Create: `src/components/scan-code-field.tsx`
- Modify: `src/lib/actions/motors.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add mobile entry page**

Create `src/app/mobile/page.tsx`:

```tsx
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";

export default async function MobileHomePage() {
  await requireCurrentUser();

  return (
    <main className="mobile-shell">
      <h1>现场扫码</h1>
      <p className="muted">用于手机端查询、入库和出库。摄像头扫码不可用时，可以手动输入编码。</p>
      <div className="mobile-actions">
        <Link className="button" href="/mobile/scan">扫码查询</Link>
        <Link className="button" href="/mobile/inbound">扫码入库</Link>
        <Link className="button" href="/mobile/outbound">扫码出库</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add scan field component**

Create `src/components/scan-code-field.tsx`:

```tsx
export function ScanCodeField({ placeholder = "扫描或输入电机编码" }: { placeholder?: string }) {
  return (
    <div className="scan-field">
      <label htmlFor="scannedCode">电机编码</label>
      <input id="scannedCode" name="scannedCode" required autoFocus placeholder={placeholder} />
      <p className="muted">当前 demo 保留手动输入；接入摄像头扫码后仍复用这个编码输入。</p>
    </div>
  );
}
```

- [ ] **Step 3: Add mobile query action**

In `src/lib/actions/motors.ts`, add:

```ts
export async function mobileLookupMotorAction(formData: FormData) {
  await requireCurrentUser();
  const scannedCode = normalizeScannedCode(formData.get("scannedCode"));

  if (!scannedCode) {
    redirect(resultUrl("/mobile/scan", {
      type: "error",
      title: "查询失败",
      message: "请先扫码或输入电机编码。"
    }));
  }

  const motor = await findMotorByScannedCode(prisma, scannedCode);
  if (!motor) {
    redirect(resultUrl("/mobile/scan", {
      type: "error",
      title: "未找到电机",
      message: `没有找到编码为 ${scannedCode} 的电机。`
    }));
  }

  redirect(resultUrl("/mobile/scan", {
    type: "success",
    title: "已找到电机",
    message: `${motor.motorCode} / ${motor.model}`,
    motorId: motor.id,
    motorCode: motor.motorCode
  }));
}
```

Also add mobile-specific inbound and outbound actions that call the same core logic but redirect back to `/mobile/inbound` and `/mobile/outbound`.

- [ ] **Step 4: Add mobile scan page**

Create `src/app/mobile/scan/page.tsx` using `mobileLookupMotorAction`, `ScanCodeField`, and `ResultPanel`.

- [ ] **Step 5: Add mobile inbound page**

Create `src/app/mobile/inbound/page.tsx` using `mobileInboundMotorAction`, `ScanCodeField`, and `ResultPanel`.

- [ ] **Step 6: Add mobile outbound page**

Create `src/app/mobile/outbound/page.tsx` with `ScanCodeField`, required `issuedBy` and `vehicle` inputs, and `ResultPanel`.

- [ ] **Step 7: Add mobile CSS**

Add:

```css
.mobile-shell {
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.mobile-actions {
  display: grid;
  gap: 12px;
}

.scan-field {
  display: grid;
  gap: 8px;
}

.scan-field input {
  min-height: 48px;
  font-size: 18px;
}

.result-panel {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.result-panel.success {
  border-color: #88c7b4;
  background: #effaf6;
}

.result-panel.error {
  border-color: #efb1a9;
  background: #fff3f1;
}
```

- [ ] **Step 8: Run type check**

Run: `npm run lint`

Expected: TypeScript passes.

## Task 7: Repair Documentation and Progress Notes

**Files:**
- Modify: `README.md`
- Modify: `docs/project-progress.md`
- Modify: `docs/final-motor-pilot-target.md`

- [ ] **Step 1: Rewrite README in readable Chinese**

Include run commands, login accounts, current scope, desktop URL, and mobile URL:

```md
# HJ Resource Management

电机资源管理完整 demo。当前版本聚焦电机建档、自动编码、标签展示、电脑端管理、手机端扫码查询、手机端入库/出库和操作留痕。
```

- [ ] **Step 2: Update progress document**

Set current stage to `完整 demo 闭环开发阶段` and list remaining implementation tasks for label page, mobile pages, and feedback handling.

- [ ] **Step 3: Update final target document**

Record that the next demo must be complete before field testing: desktop build/label management plus mobile scan query/inbound/outbound.

## Task 8: Full Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run type check**

Run: `npm run lint`

Expected: TypeScript passes.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: Next.js build passes.

- [ ] **Step 4: Start local dev server**

Run: `npm run dev`

Expected: server listens on `http://localhost:4011`.

- [ ] **Step 5: Open in Google Chrome**

Open `http://localhost:4011/login` in Google Chrome. Log in with `admin / admin123`.

Expected visible smoke path:

- 首页中文正常。
- 电机列表中文正常。
- 新建电机页面中文正常.
- 详情页能进入标签打印页。
- `/mobile` 能打开手机端入口。

## Self-Review Notes

- The plan covers desktop text repair, label printing, action feedback, mobile entry/query/inbound/outbound, documentation, and verification.
- The plan intentionally keeps editing/deletion/export/backup out of scope.
- The plan preserves the current database schema and existing app architecture.
