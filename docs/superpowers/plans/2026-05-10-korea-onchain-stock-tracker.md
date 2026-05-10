# Korea Onchain Stock Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live Coinbase-style dashboard showing Korean stock top names, Lighter perp prices, and Upbit USDT/KRW converted prices.

**Architecture:** Use a Vite React TypeScript app with focused data adapters for Lighter, Upbit, and Korean equity data. Keep source freshness and failure states separate so one failed feed does not break the whole dashboard.

**Tech Stack:** Vite, React, TypeScript, CSS modules/plain CSS, Vitest, Testing Library, lucide-react.

---

## File Structure

- `package.json`: scripts and dependencies.
- `vite.config.ts`: Vite and Vitest configuration.
- `src/domain/markets.ts`: stock mappings, value types, conversion helpers, gap helpers.
- `src/services/upbit.ts`: Upbit `KRW-USDT` quote adapter.
- `src/services/lighter.ts`: Lighter market adapter with documented fallback payload parsing.
- `src/services/koreanEquities.ts`: domestic top names adapter and static fallback for first MVP.
- `src/services/snapshots.ts`: combines source data into dashboard rows.
- `src/App.tsx`: dashboard UI and polling loop.
- `src/App.css`: Coinbase-like trading dashboard styling.
- `src/main.tsx`: React entrypoint.
- `src/**/*.test.ts`: unit tests for conversion, source parsing, and row composition.

## Task 1: Scaffold App And Test Harness

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.css`

- [ ] **Step 1: Create Vite React TypeScript project files**

Create the listed files with a minimal dashboard shell that renders without data.

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Run initial checks**

Run: `npm run build`

Expected: TypeScript compile and Vite production build succeed.

- [ ] **Step 4: Commit**

Run:

```bash
git add .
git commit -m "chore: scaffold tracker app"
```

## Task 2: Domain Model And Calculations

**Files:**
- Create: `src/domain/markets.ts`
- Create: `src/domain/markets.test.ts`

- [ ] **Step 1: Write tests for conversion and gap calculations**

Test `convertUsdToKrw(100, 1400) === 140000` and `calculateGapPercent(112000, 100000) === 12`.

- [ ] **Step 2: Implement domain helpers**

Define `TrackedStock`, `SourceState`, `MarketSnapshot`, `convertUsdToKrw`, `calculateGapPercent`, and initial mappings for Samsung Electronics, SK Hynix, Hyundai Motor, and Korean composite proxy.

- [ ] **Step 3: Run tests**

Run: `npm test -- --run src/domain/markets.test.ts`

Expected: tests pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/domain/markets.ts src/domain/markets.test.ts
git commit -m "feat: add market domain helpers"
```

## Task 3: Data Adapters

**Files:**
- Create: `src/services/upbit.ts`
- Create: `src/services/lighter.ts`
- Create: `src/services/koreanEquities.ts`
- Create: `src/services/*.test.ts`

- [ ] **Step 1: Add parser tests**

Write tests for Upbit ticker parsing, Lighter ticker parsing from common market payload shapes, and domestic fallback rows.

- [ ] **Step 2: Implement Upbit adapter**

Fetch `https://api.upbit.com/v1/ticker?markets=KRW-USDT` and return trade price plus timestamp.

- [ ] **Step 3: Implement Lighter adapter**

Fetch market/ticker candidates from Lighter-compatible endpoints and parse symbols `SAMSUNG`, `SKHYNIX`, `HYUNDAI`, and `KRCOMP` when present. If live endpoint discovery fails, return a source error while preserving the UI.

- [ ] **Step 4: Implement domestic fallback adapter**

Return Samsung Electronics, SK Hynix, Hyundai Motor, NAVER, and Kakao as seed rows with domestic reference prices marked as fallback until a Korean market provider is attached.

- [ ] **Step 5: Run tests**

Run: `npm test -- --run src/services`

Expected: adapter parser tests pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/services
git commit -m "feat: add market data adapters"
```

## Task 4: Snapshot Composition

**Files:**
- Create: `src/services/snapshots.ts`
- Create: `src/services/snapshots.test.ts`

- [ ] **Step 1: Write composition tests**

Test that Samsung gets Lighter and converted KRW values when both Lighter and Upbit are available, and that an unmapped domestic stock shows `No onchain market`.

- [ ] **Step 2: Implement snapshot composer**

Merge domestic rows, Lighter rows, and Upbit conversion into one dashboard row model with source state per row.

- [ ] **Step 3: Run tests**

Run: `npm test -- --run src/services/snapshots.test.ts`

Expected: composition tests pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/services/snapshots.ts src/services/snapshots.test.ts
git commit -m "feat: compose dashboard snapshots"
```

## Task 5: Dashboard UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Use Coinbase design reference**

Run: `npx getdesign@latest add coinbase`

Expected: command completes or reports usable reference output. If unavailable, continue with Coinbase-like styling described in the design spec.

- [ ] **Step 2: Implement polling UI**

Poll snapshots every 10 seconds, render source freshness, market rows, selected-stock detail panel, and conversion rate.

- [ ] **Step 3: Build responsive CSS**

Use compact tables on desktop and stacked rows on mobile. Keep numeric columns aligned and avoid decorative cards inside cards.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/App.tsx src/App.css
git commit -m "feat: build live tracker dashboard"
```

## Task 6: Documentation And Local Run

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document usage**

Add install, dev server, build, and data-source caveats.

- [ ] **Step 2: Run final checks**

Run:

```bash
npm test -- --run
npm run build
```

Expected: all tests and build pass.

- [ ] **Step 3: Start dev server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: local URL is printed.

- [ ] **Step 4: Commit and push**

Run:

```bash
git add README.md
git commit -m "docs: add local usage instructions"
git push
```

## Self-Review

- Spec coverage: The plan covers Lighter, Upbit conversion, domestic top rows, Coinbase-like UI, source freshness, and signal deferral.
- Completeness scan: The plan intentionally leaves exact Korean equity provider and exact Lighter endpoint as implementation discovery items because those were open decisions in the approved spec; adapters must expose failure states when live endpoints are unavailable.
- Type consistency: Row composition uses domain models from `src/domain/markets.ts` throughout services and UI.
