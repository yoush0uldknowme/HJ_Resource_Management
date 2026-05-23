# Motor Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a LAN-accessible motor inventory pilot web app that supports archive, code generation, inbound, outbound, query, photos, and audit trail.

**Architecture:** Use a Next.js full-stack app so the first version can ship quickly as one deployable service. Persist structured data in SQLite through Prisma, store uploaded images on local disk, and render a responsive UI with server routes for core CRUD and inventory transitions.

**Tech Stack:** Next.js, React, TypeScript, Prisma, SQLite, Tailwind CSS, Zod, qrcode

---

### Task 1: Scaffold the app shell

**Files:**
- Create: `E:\Software\own\HJ_Resource Management\app\...`
- Create: `E:\Software\own\HJ_Resource Management\package.json`
- Create: `E:\Software\own\HJ_Resource Management\tsconfig.json`
- Create: `E:\Software\own\HJ_Resource Management\next.config.ts`
- Test: `npm run lint`

- [ ] Step 1: Create the Next.js project structure and package manifest
- [ ] Step 2: Install dependencies and confirm the app boots
- [ ] Step 3: Add global layout, navigation shell, and responsive styling
- [ ] Step 4: Run lint and confirm the scaffold is clean

### Task 2: Define and verify persistence

**Files:**
- Create: `E:\Software\own\HJ_Resource Management\prisma\schema.prisma`
- Create: `E:\Software\own\HJ_Resource Management\src\lib\db.ts`
- Test: `npm run prisma:generate`

- [ ] Step 1: Write schema for users, motors, photos, and transactions
- [ ] Step 2: Generate Prisma client and initialize SQLite database
- [ ] Step 3: Add seed data for initial login and sample display
- [ ] Step 4: Verify schema generation succeeds

### Task 3: Implement motor management flows

**Files:**
- Create: `E:\Software\own\HJ_Resource Management\src\lib\motor-code.ts`
- Create: `E:\Software\own\HJ_Resource Management\src\lib\actions\motors.ts`
- Create: `E:\Software\own\HJ_Resource Management\src\app\motors\...`
- Test: `npm test`

- [ ] Step 1: Add failing tests for motor code generation and state transitions
- [ ] Step 2: Implement create, inbound, outbound, and detail retrieval flows
- [ ] Step 3: Add list and detail UI for motors
- [ ] Step 4: Re-run targeted tests until green

### Task 4: Add images, QR rendering, and records

**Files:**
- Create: `E:\Software\own\HJ_Resource Management\src\app\api\upload\route.ts`
- Create: `E:\Software\own\HJ_Resource Management\src\components\...`
- Test: `npm run lint`

- [ ] Step 1: Add local upload handling for motor photos
- [ ] Step 2: Render QR code assets for each motor
- [ ] Step 3: Surface transaction history and operator records in UI
- [ ] Step 4: Run lint again

### Task 5: Final verification and run

**Files:**
- Create: `E:\Software\own\HJ_Resource Management\README.md`
- Modify: `E:\Software\own\HJ_Resource Management\package.json`
- Test: `npm run build`

- [ ] Step 1: Add run instructions and default account notes
- [ ] Step 2: Verify build succeeds
- [ ] Step 3: Start dev server and confirm the local URL
