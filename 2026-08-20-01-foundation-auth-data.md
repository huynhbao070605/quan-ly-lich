# Foundation, Auth & Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khởi tạo web app Next.js bằng tiếng Việt, thiết lập Supabase Auth/PostgreSQL/RLS, shell responsive, tài khoản người dùng và schema dữ liệu nền tảng an toàn cho toàn bộ V1.

**Architecture:** Next.js App Router chịu trách nhiệm UI và server actions; Supabase cung cấp Auth, PostgreSQL và Row Level Security. Mọi dữ liệu nghiệp vụ gắn với `auth.uid()`, và client không bao giờ được tự quyết định `user_id`.

**Tech Stack:** Next.js, TypeScript, pnpm, Tailwind CSS, shadcn/ui, Supabase Auth/PostgreSQL/RLS, `@supabase/ssr`, Zod, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-20-personal-productivity-app-v1-design.md`

## Global Constraints

- Toàn bộ nội dung người dùng nhìn thấy phải bằng tiếng Việt.
- Timezone V1 cố định: `Asia/Ho_Chi_Minh (UTC+7)`.
- Public signup.
- Google OAuth + Email/Password.
- Mỗi user chỉ đọc/sửa/xóa dữ liệu của chính họ.
- Không có team/workspace, giao task, attachment, billing, AI hay microservices trong V1.
- Internal code/database identifiers dùng tiếng Anh.
- Dùng Row Level Security cho mọi bảng dữ liệu theo user.
- Không expose `SUPABASE_SERVICE_ROLE_KEY` xuống browser.
- TDD: mỗi hành vi nghiệp vụ bắt đầu bằng test thất bại trước khi triển khai.
- Commit sau mỗi task độc lập.

---

## File Map

### Root/config
- `package.json` — dependencies và scripts.
- `.env.example` — biến môi trường công khai và server-only.
- `vitest.config.ts` — unit/component test.
- `src/test/setup.ts` — Testing Library setup.
- `proxy.ts` — refresh Supabase session và bảo vệ route `/app` theo file convention hiện hành của Next.js.

### Supabase
- `supabase/migrations/202608200001_initial_schema.sql` — tables, enums, indexes, triggers.
- `supabase/migrations/202608200002_rls_policies.sql` — RLS policies.
- `supabase/seed.sql` — dữ liệu local tối thiểu, không chứa tài khoản thật.

### Auth & app shell
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/proxy.ts`
- `src/lib/auth/require-user.ts`
- `src/lib/validation/auth.ts`
- `src/app/(auth)/dang-nhap/page.tsx`
- `src/app/(auth)/dang-ky/page.tsx`
- `src/app/(auth)/quen-mat-khau/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/(dashboard)/app/layout.tsx`
- `src/components/layout/app-sidebar.tsx`
- `src/components/layout/mobile-nav.tsx`
- `src/components/layout/top-bar.tsx`

### Profile/settings
- `src/actions/profile-actions.ts`
- `src/actions/settings-actions.ts`
- `src/app/(dashboard)/app/cai-dat/page.tsx`
- `src/components/settings/profile-form.tsx`
- `src/components/settings/appearance-form.tsx`

### Shared domain
- `src/lib/domain/constants.ts` — status/priority labels tiếng Việt.
- `src/lib/domain/time.ts` — timezone helpers.
- `src/types/database.ts` — generated Supabase types.

---

### Task 1: Bootstrap dự án và test harness

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/app/page.tsx`
- Create: `src/app/layout.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: không có.
- Produces: scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:run`; root page redirect/link đến `/dang-nhap`.

- [ ] **Step 1: Khởi tạo Next.js project**

Run:
```bash
pnpm create next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Expected: project Next.js App Router chạy được.

- [ ] **Step 2: Cài dependencies nền**

Run:
```bash
pnpm add @supabase/ssr @supabase/supabase-js zod
pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm dlx shadcn@latest init -d
```

Expected: dependencies và shadcn/ui base configuration được tạo thành công.

- [ ] **Step 3: Thêm test scripts**

Modify `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 4: Tạo Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Run:
```bash
pnpm add -D @vitejs/plugin-react
```

- [ ] **Step 5: Tạo test setup**

Create `src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Viết failing test cho landing redirect CTA**

Create `src/app/page.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

test("hiển thị lối vào đăng nhập bằng tiếng Việt", () => {
  render(<HomePage />);
  expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
    "href",
    "/dang-nhap",
  );
});
```

- [ ] **Step 7: Chạy test để xác nhận FAIL**

Run:
```bash
pnpm test:run src/app/page.test.tsx
```

Expected: FAIL vì page mặc định chưa có link `Đăng nhập`.

- [ ] **Step 8: Viết implementation tối thiểu**

Replace `src/app/page.tsx`:
```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Link href="/dang-nhap">Đăng nhập</Link>
    </main>
  );
}
```

- [ ] **Step 9: Chạy verification**

Run:
```bash
pnpm test:run src/app/page.test.tsx
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "chore: bootstrap task manager app"
```

---

### Task 2: Supabase browser/server clients và session middleware

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/proxy.ts`
- Create: `proxy.ts`
- Create: `.env.example`
- Test: `src/lib/supabase/env.test.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Produces: `createBrowserClient()`, `createServerClient()`, `updateSession(request)`.

- [ ] **Step 1: Viết test cho env contract**

Create `src/lib/supabase/env.test.ts`:
```ts
import { describe, expect, test } from "vitest";

describe("Supabase environment contract", () => {
  test("documented public variables exist in .env.example", async () => {
    const fs = await import("node:fs/promises");
    const text = await fs.readFile(".env.example", "utf8");
    expect(text).toContain("NEXT_PUBLIC_SUPABASE_URL=");
    expect(text).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=");
    expect(text).toContain("SUPABASE_SERVICE_ROLE_KEY=");
  });
});
```

- [ ] **Step 2: Chạy test và xác nhận FAIL**

```bash
pnpm test:run src/lib/supabase/env.test.ts
```

Expected: FAIL vì `.env.example` chưa đầy đủ.

- [ ] **Step 3: Tạo `.env.example`**

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: Tạo browser client**

Create `src/lib/supabase/client.ts`:
```ts
import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

- [ ] **Step 5: Tạo server client**

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot always mutate cookies.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 6: Tạo session middleware helper**

Create `src/lib/supabase/proxy.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/app") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dang-nhap";
    return NextResponse.redirect(url);
  }

  return response;
}
```

- [ ] **Step 7: Bảo vệ `/app/*`**

Create root `proxy.ts`:
```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

Inside `updateSession`, if pathname starts with `/app` and no user exists, redirect to `/dang-nhap`.

- [ ] **Step 8: Verify**

```bash
pnpm test:run src/lib/supabase/env.test.ts
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add .env.example proxy.ts src/lib/supabase
git commit -m "feat: configure supabase session clients"
```

---

### Task 3: Initial PostgreSQL schema

**Files:**
- Create: `supabase/migrations/202608200001_initial_schema.sql`
- Test: `supabase/tests/schema_smoke.sql`

**Interfaces:**
- Consumes: Supabase `auth.users`.
- Produces tables: `profiles`, `projects`, `tags`, `tasks`, `task_tags`, `subtasks`, `task_reminders`, `task_recurrences`, `notifications`, `user_settings`.

- [ ] **Step 1: Viết schema smoke assertions**

Create `supabase/tests/schema_smoke.sql`:
```sql
select to_regclass('public.profiles') is not null as profiles_exists;
select to_regclass('public.tasks') is not null as tasks_exists;
select to_regclass('public.projects') is not null as projects_exists;
select to_regclass('public.tags') is not null as tags_exists;
select to_regclass('public.task_tags') is not null as task_tags_exists;
select to_regclass('public.subtasks') is not null as subtasks_exists;
select to_regclass('public.task_reminders') is not null as reminders_exists;
select to_regclass('public.task_recurrences') is not null as recurrences_exists;
select to_regclass('public.notifications') is not null as notifications_exists;
select to_regclass('public.user_settings') is not null as settings_exists;
```

- [ ] **Step 2: Start local Supabase and verify assertions fail**

Run:
```bash
npx supabase start
npx supabase db reset
```

Expected: schema assertions cannot succeed because tables do not exist yet.

- [ ] **Step 3: Create enums and core tables**

In `202608200001_initial_schema.sql`, define:
```sql
create type public.task_status as enum ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');
create type public.task_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
create type public.notification_type as enum ('REMINDER', 'DUE_TODAY', 'OVERDUE', 'RECURRING_CREATED');
create type public.recurrence_frequency as enum ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
```

Create all tables using UUID primary keys and `auth.users(id)` ownership. Required `tasks` columns:
```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
project_id uuid references public.projects(id) on delete set null,
title text not null check (char_length(title) between 1 and 200),
description text,
status public.task_status not null default 'TODO',
priority public.task_priority not null default 'MEDIUM',
start_at timestamptz,
due_at timestamptz,
all_day boolean not null default false,
important boolean not null default false,
urgent boolean not null default false,
eisenhower_override boolean not null default false,
focus_date date,
focus_position integer,
kanban_position numeric not null default 0,
completed_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

- [ ] **Step 4: Create child tables and uniqueness constraints**

Required constraints:
```sql
unique (task_id, tag_id)
```
for `task_tags`, and one `user_settings` row per user.

For `task_reminders`, include:
```sql
offset_minutes integer not null check (offset_minutes >= 0),
remind_at timestamptz not null,
triggered_at timestamptz
```

For `task_recurrences`, include:
```sql
frequency public.recurrence_frequency not null,
interval integer not null default 1 check (interval >= 1),
weekdays smallint[],
month_day smallint check (month_day between 1 and 31),
ends_at timestamptz
```

- [ ] **Step 5: Add indexes**

Create indexes for:
- `tasks(user_id, status)`
- `tasks(user_id, due_at)`
- `tasks(user_id, project_id)`
- `notifications(user_id, read_at, created_at desc)`
- `task_reminders(user_id, remind_at)` where `triggered_at is null`

- [ ] **Step 6: Add updated_at trigger**

Create `public.set_updated_at()` and attach to mutable core tables.

- [ ] **Step 7: Apply migration**

```bash
npx supabase db reset
```

Expected: migration succeeds.

- [ ] **Step 8: Generate database types**

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

- [ ] **Step 9: Verify**

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add supabase src/types/database.ts
git commit -m "feat: add initial task manager schema"
```

---

### Task 4: RLS policies và ownership protection

**Files:**
- Create: `supabase/migrations/202608200002_rls_policies.sql`
- Create: `supabase/tests/rls.sql`

**Interfaces:**
- Consumes: schema from Task 3.
- Produces: RLS policy guarantees for every user-owned table.

- [ ] **Step 1: Viết RLS test cases**

`supabase/tests/rls.sql` must exercise:
1. User A inserts own task → success.
2. User B selects task A → zero rows.
3. User B updates task A → zero rows affected.
4. User B deletes task A → zero rows affected.
5. User cannot insert `tasks.user_id` different from `auth.uid()`.

Use Supabase test JWT claims via:
```sql
select set_config('request.jwt.claim.sub', '<uuid>', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
```

- [ ] **Step 2: Run and observe failure before policies**

Expected: cross-user access is possible or table access is not yet constrained as required.

- [ ] **Step 3: Enable RLS**

Enable RLS on:
```text
profiles
projects
tags
tasks
task_tags
subtasks
task_reminders
task_recurrences
notifications
user_settings
```

- [ ] **Step 4: Create direct ownership policies**

For tables with `user_id`, use:
```sql
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id)
```

For `profiles`, use:
```sql
(select auth.uid()) = id
```

- [ ] **Step 5: Create child-table policies through parent ownership**

For `subtasks`, `task_tags`, and `task_recurrences`, use `exists (...)` against `tasks` owned by `auth.uid()`.

- [ ] **Step 6: Apply migration and run RLS tests**

```bash
npx supabase db reset
```

Expected: all five security cases behave exactly as listed.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/202608200002_rls_policies.sql supabase/tests/rls.sql
git commit -m "feat: enforce row level security"
```

---

### Task 5: Vietnamese domain constants and timezone helpers

**Files:**
- Create: `src/lib/domain/constants.ts`
- Create: `src/lib/domain/time.ts`
- Test: `src/lib/domain/constants.test.ts`
- Test: `src/lib/domain/time.test.ts`

**Interfaces:**
- Produces:
  - `TASK_STATUS_LABELS`
  - `TASK_PRIORITY_LABELS`
  - `APP_TIME_ZONE = "Asia/Ho_Chi_Minh"`
  - `formatVietnamDateTime(date)`
  - `isOverdue({ dueAt, status, now })`

- [ ] **Step 1: Write failing labels test**

```ts
import { expect, test } from "vitest";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "./constants";

test("status và priority hiển thị bằng tiếng Việt", () => {
  expect(TASK_STATUS_LABELS.TODO).toBe("Cần làm");
  expect(TASK_STATUS_LABELS.IN_PROGRESS).toBe("Đang thực hiện");
  expect(TASK_STATUS_LABELS.DONE).toBe("Hoàn thành");
  expect(TASK_STATUS_LABELS.CANCELLED).toBe("Đã hủy");
  expect(TASK_PRIORITY_LABELS.URGENT).toBe("Khẩn cấp");
});
```

- [ ] **Step 2: Run FAIL**

```bash
pnpm test:run src/lib/domain/constants.test.ts
```

- [ ] **Step 3: Implement constants**

```ts
export const TASK_STATUS_LABELS = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang thực hiện",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
} as const;

export const TASK_PRIORITY_LABELS = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
} as const;

export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";
```

- [ ] **Step 4: Write failing overdue test**

```ts
import { expect, test } from "vitest";
import { isOverdue } from "./time";

test("DONE và CANCELLED không bao giờ được coi là quá hạn", () => {
  const now = new Date("2026-08-20T10:00:00+07:00");
  const dueAt = new Date("2026-08-20T09:00:00+07:00");
  expect(isOverdue({ dueAt, status: "DONE", now })).toBe(false);
  expect(isOverdue({ dueAt, status: "CANCELLED", now })).toBe(false);
  expect(isOverdue({ dueAt, status: "TODO", now })).toBe(true);
});
```

- [ ] **Step 5: Implement time helpers**

Use `Intl.DateTimeFormat("vi-VN", { timeZone: APP_TIME_ZONE, ... })`, and implement overdue exactly from spec.

- [ ] **Step 6: Verify**

```bash
pnpm test:run src/lib/domain
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/domain
git commit -m "feat: add vietnamese domain labels and time rules"
```

---

### Task 6: Authentication validation and server actions

**Files:**
- Create: `src/lib/validation/auth.ts`
- Create: `src/actions/auth-actions.ts`
- Test: `src/lib/validation/auth.test.ts`

**Interfaces:**
- Produces:
  - `signUpSchema`
  - `signInSchema`
  - `signUpWithEmail(formData)`
  - `signInWithEmail(formData)`
  - `signInWithGoogle()`
  - `signOut()`
  - `requestPasswordReset(formData)`

- [ ] **Step 1: Write failing validation tests**

Test:
```ts
expect(signUpSchema.safeParse({
  displayName: "An",
  email: "an@example.com",
  password: "12345678",
}).success).toBe(true);

expect(signUpSchema.safeParse({
  displayName: "",
  email: "sai",
  password: "123",
}).success).toBe(false);
```

- [ ] **Step 2: Run FAIL**

```bash
pnpm test:run src/lib/validation/auth.test.ts
```

- [ ] **Step 3: Implement Zod schemas**

Use:
```ts
z.object({
  displayName: z.string().trim().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
```

Sign-in requires email/password; reset requires email.

- [ ] **Step 4: Implement auth server actions**

Use `createServerClient()` and Supabase:
- `auth.signUp`
- `auth.signInWithPassword`
- `auth.signInWithOAuth({ provider: "google" })`
- `auth.signOut`
- `auth.resetPasswordForEmail`

All user-facing errors returned in Vietnamese:
```ts
{ ok: false, message: "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu." }
```

- [ ] **Step 5: Verify**

```bash
pnpm test:run src/lib/validation/auth.test.ts
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/validation/auth.ts src/actions/auth-actions.ts src/lib/validation/auth.test.ts
git commit -m "feat: add authentication actions"
```

---

### Task 7: Login, signup, reset-password UI

**Files:**
- Create: `src/app/(auth)/dang-nhap/page.tsx`
- Create: `src/app/(auth)/dang-ky/page.tsx`
- Create: `src/app/(auth)/quen-mat-khau/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/components/auth/auth-card.tsx`
- Test: `src/components/auth/auth-card.test.tsx`

**Interfaces:**
- Consumes: auth actions from Task 6.
- Produces: public auth flows and Google callback.

- [ ] **Step 1: Write failing UI test**

```tsx
render(<AuthCard mode="login" />);
expect(screen.getByRole("button", { name: "Tiếp tục với Google" })).toBeVisible();
expect(screen.getByLabelText("Email")).toBeVisible();
expect(screen.getByLabelText("Mật khẩu")).toBeVisible();
expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeVisible();
```

- [ ] **Step 2: Run FAIL**

```bash
pnpm test:run src/components/auth/auth-card.test.tsx
```

- [ ] **Step 3: Implement reusable AuthCard**

Render Vietnamese copy for login/signup/reset. Wire server actions through forms.

- [ ] **Step 4: Implement callback route**

Exchange OAuth code for session, then redirect to `/app/tong-quan`.

- [ ] **Step 5: Verify pages**

Run:
```bash
pnpm dev
```

Manual:
- `/dang-nhap`
- `/dang-ky`
- `/quen-mat-khau`

Expected: all render entirely in Vietnamese and submit to correct actions.

- [ ] **Step 6: Automated verify**

```bash
pnpm test:run src/components/auth/auth-card.test.tsx
pnpm typecheck
pnpm lint
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(auth\) src/app/auth src/components/auth
git commit -m "feat: build vietnamese authentication screens"
```

---

### Task 8: Profile bootstrap and default settings

**Files:**
- Create: `supabase/migrations/202608200003_profile_bootstrap.sql`
- Create: `src/lib/auth/require-user.ts`
- Test: `src/lib/auth/require-user.test.ts`

**Interfaces:**
- Produces automatic `profiles` + `user_settings` creation for each new auth user.
- Produces `requireUser(): Promise<User>`.

- [ ] **Step 1: Write failing database expectation**

After creating an auth user in local Supabase, assert:
```sql
select count(*) = 1 from public.profiles where id = '<user-id>';
select count(*) = 1 from public.user_settings where user_id = '<user-id>';
```

- [ ] **Step 2: Create trigger function**

Migration creates `public.handle_new_user()` as security definer with fixed `search_path`, inserting:
- profile name from `raw_user_meta_data->>'full_name'` when available;
- default settings: theme `system`, priority `MEDIUM`, week start Monday.

- [ ] **Step 3: Attach trigger to `auth.users`**

```sql
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

- [ ] **Step 4: Implement `requireUser()`**

Use server Supabase auth getUser; redirect `/dang-nhap` if absent.

- [ ] **Step 5: Verify migration and typecheck**

```bash
npx supabase db reset
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/202608200003_profile_bootstrap.sql src/lib/auth
git commit -m "feat: bootstrap profiles and settings"
```

---

### Task 9: Responsive authenticated app shell

**Files:**
- Create: `src/app/(dashboard)/app/layout.tsx`
- Create: `src/app/(dashboard)/app/tong-quan/page.tsx`
- Create: `src/components/layout/app-sidebar.tsx`
- Create: `src/components/layout/mobile-nav.tsx`
- Create: `src/components/layout/top-bar.tsx`
- Test: `src/components/layout/app-sidebar.test.tsx`

**Interfaces:**
- Consumes: `requireUser()`.
- Produces: shared authenticated layout and Vietnamese navigation.

- [ ] **Step 1: Write failing sidebar labels test**

Assert visible links:
```text
Tổng quan
Công việc
Lịch
Kanban
Ma trận Eisenhower
Kế hoạch hôm nay
Kế hoạch tuần
Dự án
Cài đặt
```

- [ ] **Step 2: Run FAIL**

```bash
pnpm test:run src/components/layout/app-sidebar.test.tsx
```

- [ ] **Step 3: Implement desktop sidebar**

Links use routes:
```text
/app/tong-quan
/app/cong-viec
/app/lich
/app/kanban
/app/eisenhower
/app/ke-hoach-ngay
/app/ke-hoach-tuan
/app/du-an
/app/cai-dat
```

- [ ] **Step 4: Implement mobile navigation**

Items:
```text
Trang chủ
Công việc
+
Lịch
Thêm
```

- [ ] **Step 5: Implement top bar**

Include global search placeholder `Tìm công việc...`, notification button, avatar menu.

- [ ] **Step 6: Protect app layout**

Call `requireUser()` before rendering authenticated shell.

- [ ] **Step 7: Verify**

```bash
pnpm test:run src/components/layout/app-sidebar.test.tsx
pnpm typecheck
pnpm lint
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(dashboard\) src/components/layout
git commit -m "feat: add responsive authenticated app shell"
```

---

### Task 10: Profile and appearance settings

**Files:**
- Create: `src/actions/profile-actions.ts`
- Create: `src/actions/settings-actions.ts`
- Create: `src/app/(dashboard)/app/cai-dat/page.tsx`
- Create: `src/components/settings/profile-form.tsx`
- Create: `src/components/settings/appearance-form.tsx`
- Test: `src/components/settings/appearance-form.test.tsx`

**Interfaces:**
- Produces:
  - `updateProfile({ displayName })`
  - `updateAppearance({ theme })`
  - Settings UI in Vietnamese.

- [ ] **Step 1: Write failing theme test**

```tsx
render(<AppearanceForm initialTheme="system" />);
expect(screen.getByLabelText("Sáng")).toBeVisible();
expect(screen.getByLabelText("Tối")).toBeVisible();
expect(screen.getByLabelText("Theo hệ thống")).toBeChecked();
```

- [ ] **Step 2: Implement actions**

`updateProfile` updates only `profiles` row where `(select auth.uid()) = id`.
`updateAppearance` accepts only `light | dark | system`.

- [ ] **Step 3: Implement settings page**

Tabs/sections:
- Hồ sơ
- Giao diện
- Mặc định công việc
- Thông báo
- Tài khoản

Trong milestone này chỉ render hai section hoạt động: `Hồ sơ` và `Giao diện`. Các section còn lại chưa xuất hiện cho đến khi được triển khai trong Plan 4.

- [ ] **Step 4: Verify**

```bash
pnpm test:run src/components/settings/appearance-form.test.tsx
pnpm typecheck
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/actions src/app/\(dashboard\)/app/cai-dat src/components/settings
git commit -m "feat: add profile and appearance settings"
```

---

## Plan 1 Completion Gate

Run:
```bash
pnpm test:run
pnpm typecheck
pnpm lint
pnpm build
npx supabase db reset
```

Manual acceptance:
1. User can open signup/login screens in Vietnamese.
2. Email/password and Google flows are wired to Supabase.
3. `/app/*` redirects unauthenticated users.
4. Authenticated user reaches `/app/tong-quan`.
5. User profile/settings rows are created automatically.
6. Cross-user RLS tests pass.
7. Sidebar/mobile navigation renders correctly.

Commit:
```bash
git add .
git commit -m "chore: complete foundation auth and data milestone"
```