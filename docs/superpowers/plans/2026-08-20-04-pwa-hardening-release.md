# PWA, Hardening & Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện responsive/PWA, settings còn lại, error/loading states, security verification, E2E tests, performance và quy trình deploy để đưa V1 cho bạn bè sử dụng.

**Architecture:** Giữ một Next.js codebase cho desktop/mobile/PWA. Release gate dựa trên automated tests + Supabase RLS tests + Playwright critical paths, không dựa trên kiểm tra thủ công đơn lẻ.

**Tech Stack:** Next.js, TypeScript, Tailwind, Supabase, Playwright, Vitest, PWA manifest/service worker, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-20-personal-productivity-app-v1-design.md`

## Global Constraints

- Desktop và mobile đều là first-class.
- Mobile < 768px; tablet 768–1024px; desktop > 1024px.
- PWA cài được và `display: standalone`.
- V1 không yêu cầu offline-first đầy đủ.
- Light/Dark/System.
- UI lỗi/loading/empty state bằng tiếng Việt.
- Không expose secret server-side.
- RLS/security tests phải nằm trong release gate.
- V1 không thêm attachment, push/email notification, AI, billing hoặc team features.

---

## File Map

- `src/app/manifest.ts`
- `public/icons/*`
- `public/sw.js`
- `src/components/pwa/register-service-worker.tsx`
- `src/components/theme/theme-provider.tsx`
- `src/components/settings/task-defaults-form.tsx`
- `src/components/settings/notification-settings-form.tsx`
- `src/components/settings/account-form.tsx`
- `src/app/(dashboard)/app/**/loading.tsx`
- `src/app/(dashboard)/app/**/error.tsx`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/task-flow.spec.ts`
- `tests/e2e/kanban-calendar.spec.ts`
- `tests/e2e/security.spec.ts`
- `playwright.config.ts`
- `docs/operations/deploy.md`
- `docs/operations/release-checklist.md`

---

### Task 1: Theme provider and Light/Dark/System

**Files:**
- Create: `src/components/theme/theme-provider.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/settings/appearance-form.tsx`
- Test: `src/components/theme/theme-provider.test.tsx`

**Interfaces:**
- Produces theme preference persisted from `user_settings.theme`.

- [ ] **Step 1: Install theme helper**

```bash
pnpm add next-themes
```

- [ ] **Step 2: Write failing appearance test**

Assert labels:
```text
Sáng
Tối
Theo hệ thống
```

- [ ] **Step 3: Implement provider**

Use `attribute="class"`, `defaultTheme="system"`, `enableSystem`.

- [ ] **Step 4: Persist settings**

Appearance form invokes `updateAppearance`.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test:run src/components/theme
pnpm typecheck
git add src/components/theme src/components/settings/appearance-form.tsx src/app/layout.tsx package.json pnpm-lock.yaml
git commit -m "feat: add light dark and system themes"
```

---

### Task 2: Complete task defaults and notification settings

**Files:**
- Create: `src/components/settings/task-defaults-form.tsx`
- Create: `src/components/settings/notification-settings-form.tsx`
- Modify: `src/actions/settings-actions.ts`
- Test: `src/actions/settings-actions.test.ts`

**Interfaces:**
- Produces settings for:
  - default priority;
  - default reminder offsets;
  - week starts Monday;
  - default task view;
  - notification toggles.

- [ ] **Step 1: Write failing validation tests**

Reject invalid priority, duplicate/negative reminder offsets and unsupported task view.

- [ ] **Step 2: Implement action schemas**

Normalize offsets:
```ts
[1440, 0, 1440] -> [1440, 0]
```
preserving chosen order only in UI; database may sort descending.

- [ ] **Step 3: Build Vietnamese settings forms**

Timezone shown read-only:
```text
Asia/Ho_Chi_Minh (UTC+7)
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm test:run src/actions/settings-actions.test.ts
git add src/actions/settings-actions.ts src/components/settings
git commit -m "feat: complete task and notification settings"
```

---

### Task 3: Account settings and deletion

**Files:**
- Create: `src/components/settings/account-form.tsx`
- Create: `src/actions/account-actions.ts`
- Test: `src/actions/account-actions.test.ts`

**Interfaces:**
- Produces:
```ts
signOut()
deleteCurrentAccount(confirmation)
```

- [ ] **Step 1: Write failing confirmation test**

Anything except exact `DELETE` returns:
```text
Vui lòng nhập DELETE để xác nhận.
```

- [ ] **Step 2: Implement server-only account deletion**

Use service role only inside server action after `requireUser()`. Delete `auth.users` entry; database cascades user-owned rows.

- [ ] **Step 3: Build Danger Zone**

Vietnamese warning lists:
```text
Công việc
Dự án
Thẻ
Danh sách kiểm tra
Thông báo
```

- [ ] **Step 4: Verify service role never appears in client bundle imports**

Search:
```bash
rg "SUPABASE_SERVICE_ROLE_KEY" src
```
Expected: only server-only module/action.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/account-form.tsx src/actions/account-actions.ts src/actions/account-actions.test.ts
git commit -m "feat: add secure account deletion"
```

---

### Task 4: PWA manifest and installability

**Files:**
- Create: `src/app/manifest.ts`
- Create: `src/components/pwa/register-service-worker.tsx`
- Create: `public/sw.js`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Test: `src/app/manifest.test.ts`

**Interfaces:**
- Produces installable PWA shell; no full offline data mutation promise.

- [ ] **Step 1: Write manifest test**

Assert:
```text
lang = vi
display = standalone
start_url = /app/tong-quan
192x192 icon
512x512 icon
```

- [ ] **Step 2: Implement Next.js manifest**

Use Vietnamese app name and short name.

- [ ] **Step 3: Add conservative service worker**

Cache static shell/assets only. Do not cache authenticated API mutation responses or Supabase data blindly.

- [ ] **Step 4: Register service worker in production**

Client component registers `/sw.js` when `NODE_ENV === "production"`.

- [ ] **Step 5: Verify production build**

```bash
pnpm build
pnpm start
```

Chrome DevTools Application:
- manifest valid;
- service worker active;
- installable criteria satisfied.

- [ ] **Step 6: Commit**

```bash
git add src/app/manifest.ts src/components/pwa public
git commit -m "feat: make app installable as pwa"
```

---

### Task 5: Responsive behavior audit

**Files:**
- Modify: layout/task/calendar/kanban/eisenhower/daily/weekly components
- Create: `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Produces validated layouts at mobile/tablet/desktop widths.

- [ ] **Step 1: Add Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Create Playwright config**

Base URL `http://127.0.0.1:3000`, webServer `pnpm dev`.

- [ ] **Step 3: Write viewport tests**

Test widths:
```text
390x844
820x1180
1440x900
```

Assert:
- mobile bottom nav visible at 390;
- desktop sidebar hidden at 390;
- sidebar visible at 1440;
- no horizontal document overflow.

- [ ] **Step 4: Fix responsive components**

Mobile:
- Task Detail full-screen;
- Calendar agenda default;
- Kanban one-column/swipe-friendly;
- Eisenhower tabs;
- bottom `+`.

- [ ] **Step 5: Verify and commit**

```bash
pnpm exec playwright test tests/e2e/responsive.spec.ts
git add .
git commit -m "fix: polish responsive layouts"
```

---

### Task 6: Empty, loading and error states

**Files:**
- Create/Modify: page-specific `loading.tsx`, `error.tsx`
- Create: `src/components/states/empty-state.tsx`
- Create: `src/components/states/error-state.tsx`
- Test: `src/components/states/empty-state.test.tsx`

**Interfaces:**
- Produces consistent Vietnamese feedback.

- [ ] **Step 1: Write copy test**

Required copy:
```text
Chưa có công việc
Hôm nay bạn không có việc cần xử lý.
Không thể tải dữ liệu. Vui lòng thử lại.
```

- [ ] **Step 2: Implement shared states**

Skeletons for dashboard/cards/list.

- [ ] **Step 3: Add route-level error boundaries**

`error.tsx` exposes `Thử lại` button using `reset()`.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test:run src/components/states
git add src/components/states src/app
git commit -m "feat: add loading empty and error states"
```

---

### Task 7: Accessibility baseline

**Files:**
- Modify: interactive components across app
- Create: `tests/e2e/accessibility.spec.ts`

**Interfaces:**
- Produces keyboard-accessible critical paths.

- [ ] **Step 1: Add axe**

```bash
pnpm add -D @axe-core/playwright
```

- [ ] **Step 2: Write axe tests**

Run on:
- login;
- task list;
- dashboard;
- settings.

Fail on serious/critical violations.

- [ ] **Step 3: Keyboard-test Quick Add**

Tab order reaches title, date, priority, project, submit.
Escape closes dialog.
Focus returns to launch button.

- [ ] **Step 4: Add labels/aria descriptions**

All icon-only buttons need Vietnamese accessible names, e.g.:
```text
Mở thông báo
Tạo công việc
Đóng
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm exec playwright test tests/e2e/accessibility.spec.ts
git add .
git commit -m "fix: improve application accessibility"
```

---

### Task 8: Critical E2E auth flow

**Files:**
- Create: `tests/e2e/auth.spec.ts`
- Create: `tests/e2e/helpers/auth.ts`

**Interfaces:**
- Produces browser-level proof of auth routes and protected routing.

- [ ] **Step 1: Write unauthenticated redirect test**

Visit `/app/tong-quan` → `/dang-nhap`.

- [ ] **Step 2: Write email signup/login test for local Supabase**

Use unique generated email; inspect verification strategy supported by local environment.

- [ ] **Step 3: Google OAuth**

Do not automate real Google credentials. Verify button and OAuth URL creation in component/action tests; keep real OAuth as release smoke test.

- [ ] **Step 4: Verify**

```bash
pnpm exec playwright test tests/e2e/auth.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/auth.spec.ts tests/e2e/helpers
git commit -m "test: cover authentication critical path"
```

---

### Task 9: Critical task workflow E2E

**Files:**
- Create: `tests/e2e/task-flow.spec.ts`
- Create: `tests/e2e/kanban-calendar.spec.ts`

**Interfaces:**
- Produces release tests for one-source-of-truth behavior.

- [ ] **Step 1: Task creation test**

Login → Quick Add `Nộp báo cáo` → verify task appears in Công việc.

- [ ] **Step 2: Kanban consistency test**

Move TODO → IN_PROGRESS → verify list status is `Đang thực hiện`.

- [ ] **Step 3: Eisenhower consistency test**

Set HIGH + due within 24h → appears `Làm ngay`; manual drag to `Lên lịch`; changing priority does not overwrite manual quadrant.

- [ ] **Step 4: Calendar consistency test**

Move due date → verify Daily/Weekly placement changes and reminder row recalculates via database assertion/helper.

- [ ] **Step 5: Completion test**

Mark Done → dashboard counts update.

- [ ] **Step 6: Verify and commit**

```bash
pnpm exec playwright test tests/e2e/task-flow.spec.ts tests/e2e/kanban-calendar.spec.ts
git add tests/e2e
git commit -m "test: cover core task workflows"
```

---

### Task 10: Security release tests

**Files:**
- Create: `tests/e2e/security.spec.ts`
- Create: `scripts/check-secrets.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces `pnpm security:check`.

- [ ] **Step 1: Add script**

`package.json`:
```json
{
  "scripts": {
    "security:check": "node scripts/check-secrets.mjs"
  }
}
```

- [ ] **Step 2: Implement secret scan**

Fail if client code references:
```text
SUPABASE_SERVICE_ROLE_KEY
```
or known service-role JWT prefix/value from environment.

- [ ] **Step 3: Cross-user E2E**

Create User A/B. Obtain task A ID. User B attempts direct action/API update. Expected denial/no mutation.

- [ ] **Step 4: Re-run SQL RLS suite**

```bash
npx supabase db reset
```

Expected RLS assertions pass.

- [ ] **Step 5: Verify and commit**

```bash
pnpm security:check
pnpm exec playwright test tests/e2e/security.spec.ts
git add scripts package.json tests/e2e/security.spec.ts
git commit -m "test: enforce security release checks"
```

---

### Task 11: Performance sanity checks

**Files:**
- Modify: query components where required
- Create: `docs/operations/performance.md`

**Interfaces:**
- Produces baseline performance expectations.

- [ ] **Step 1: Seed 2,000 tasks for one local user**

Create deterministic seed script or SQL fixture.

- [ ] **Step 2: Measure critical server queries**

Targets on local/dev hardware:
- Task List first page returns limited/paginated rows, not 2,000.
- Search uses server filtering.
- Dashboard uses aggregate queries.
- Notification query uses indexed `user_id/read_at`.

- [ ] **Step 3: Add pagination**

Task List page size 50. Add cursor/page navigation or infinite load; do not fetch all rows by default.

- [ ] **Step 4: Document explain plans**

Use `EXPLAIN ANALYZE` for task-by-user/due/status queries and record expected indexes.

- [ ] **Step 5: Verify build and commit**

```bash
pnpm build
git add docs/operations/performance.md src
git commit -m "perf: harden task queries for larger accounts"
```

---

### Task 12: Vercel/Supabase deployment documentation

**Files:**
- Create: `docs/operations/deploy.md`
- Create: `docs/operations/release-checklist.md`

**Interfaces:**
- Produces reproducible deploy/release process.

- [ ] **Step 1: Document Supabase production setup**

Include:
1. create project;
2. link CLI;
3. push migrations;
4. configure Google OAuth redirect;
5. verify RLS;
6. verify cron jobs.

Commands:
```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```
`<project-ref>` is a runtime value obtained from the user's Supabase project and must never be committed.

- [ ] **Step 2: Document Vercel env**

Required:
```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
```

- [ ] **Step 3: Document OAuth URLs**

Production Google/Supabase callback points to:
```text
https://<domain>/auth/callback
```
where `<domain>` is the actual deployed Vercel/custom domain.

- [ ] **Step 4: Create release checklist**

Exact commands:
```bash
pnpm test:run
pnpm typecheck
pnpm lint
pnpm security:check
pnpm build
pnpm exec playwright test
```

Database checks:
```sql
select * from cron.job;
```
and RLS smoke test.

- [ ] **Step 5: Commit**

```bash
git add docs/operations
git commit -m "docs: add deployment and release procedures"
```

---

### Task 13: Final V1 release candidate verification

**Files:**
- Modify only files needed to fix failures discovered by this gate.
- Create: `docs/operations/v1-release-report.md`

**Interfaces:**
- Produces evidence-backed V1 release candidate.

- [ ] **Step 1: Reset local database**

```bash
npx supabase db reset
```

Expected: all migrations apply from zero.

- [ ] **Step 2: Run all unit/component tests**

```bash
pnpm test:run
```

Expected: PASS.

- [ ] **Step 3: Run static checks**

```bash
pnpm typecheck
pnpm lint
pnpm security:check
```

Expected: PASS.

- [ ] **Step 4: Run production build**

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Run all E2E**

```bash
pnpm exec playwright test
```

Expected: PASS.

- [ ] **Step 6: Manual smoke on mobile + desktop**

Verify:
- Vietnamese UI;
- auth;
- Quick Add;
- List;
- Kanban;
- Calendar;
- Eisenhower;
- Daily;
- Weekly;
- recurring;
- reminder notification;
- dark mode;
- PWA installability.

- [ ] **Step 7: Write release report**

`v1-release-report.md` records:
- git commit SHA;
- command outputs summarized;
- browsers/viewports tested;
- Supabase migration version;
- cron job names;
- known non-blocking issues, if any, with explicit severity.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: prepare v1 release candidate"
```

---

## Plan 4 Completion Gate

Release only after:
```bash
pnpm test:run
pnpm typecheck
pnpm lint
pnpm security:check
pnpm build
pnpm exec playwright test
```
all pass, Supabase migrations reset cleanly, RLS checks pass, cron jobs are present, and PWA is installable in production.

At this point V1 meets the approved spec and is ready for a small public beta with family/friends.