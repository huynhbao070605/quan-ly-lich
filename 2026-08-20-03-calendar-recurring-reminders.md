# Calendar, Recurring Tasks & Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm lịch Month/Week/Day, recurrence series/occurrences, reminder nhiều mốc, Supabase Cron và trung tâm thông báo trong ứng dụng.

**Architecture:** Calendar chỉ là view của `tasks`. Recurring task được mô hình hóa thành series + occurrences để giữ lịch sử và hỗ trợ “chỉ lần này”/“lần này và các lần sau”. Reminder được materialize thành timestamps và cron tạo notification server-side dù browser đóng.

**Tech Stack:** Next.js, TypeScript, FullCalendar, Supabase PostgreSQL/RPC/Cron, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-personal-productivity-app-v1-design.md`

## Global Constraints

- UI bằng tiếng Việt.
- Timezone cố định `Asia/Ho_Chi_Minh`.
- Calendar: Month/Week/Day, all-day, timed, drag và resize.
- Recurrence V1: daily, weekly, monthly, yearly.
- Khi chỉnh recurring occurrence: hỗ trợ `Chỉ lần này` và `Lần này và các lần sau`.
- Occurrence cũ không bị sửa thành occurrence mới; lịch sử phải được giữ.
- Reminder mặc định có thể có nhiều mốc và mỗi task có thể override.
- Deadline thay đổi phải tính lại `remind_at`.
- In-app notification hoạt động kể cả browser đóng.
- Overdue notification chỉ tạo một lần cho mỗi occurrence/task.

---

## File Map

- `supabase/migrations/202608200004_recurrence_series.sql`
- `supabase/migrations/202608200005_notification_jobs.sql`
- `src/lib/recurrence/types.ts`
- `src/lib/recurrence/next-occurrence.ts`
- `src/lib/recurrence/materialize.ts`
- `src/lib/reminders/calculate.ts`
- `src/actions/recurrence-actions.ts`
- `src/actions/reminder-actions.ts`
- `src/actions/calendar-actions.ts`
- `src/actions/notification-actions.ts`
- `src/app/(dashboard)/app/lich/page.tsx`
- `src/components/calendar/task-calendar.tsx`
- `src/components/calendar/recurrence-edit-dialog.tsx`
- `src/components/notifications/notification-popover.tsx`
- `src/app/(dashboard)/app/thong-bao/page.tsx`

---

### Task 1: Normalize recurrence series and occurrence identity

**Files:**
- Create: `supabase/migrations/202608200004_recurrence_series.sql`
- Regenerate: `src/types/database.ts`
- Test: `supabase/tests/recurrence_schema.sql`

**Interfaces:**
- Produces:
  - `recurrence_series`
  - `tasks.recurrence_series_id`
  - `tasks.occurrence_start_at`
  - `tasks.recurrence_exception`

- [ ] **Step 1: Write failing schema checks**

Assert columns/table do not yet exist.

- [ ] **Step 2: Create `recurrence_series`**

Columns:
```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
source_task_id uuid references public.tasks(id) on delete set null,
frequency public.recurrence_frequency not null,
interval integer not null default 1 check (interval >= 1),
weekdays smallint[],
month_day smallint check (month_day between 1 and 31),
starts_at timestamptz not null,
ends_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

- [ ] **Step 3: Alter tasks**

Add:
```sql
recurrence_series_id uuid references public.recurrence_series(id) on delete set null,
occurrence_start_at timestamptz,
recurrence_exception boolean not null default false
```

Create unique partial index:
```sql
unique (recurrence_series_id, occurrence_start_at)
where recurrence_series_id is not null and occurrence_start_at is not null
```

- [ ] **Step 4: RLS recurrence series**

Owner only through `user_id = auth.uid()`.

- [ ] **Step 5: Keep legacy `task_recurrences` migration-compatible**

Migrate any development data into `recurrence_series`, then drop `task_recurrences` before production launch. Because this project has no production data yet, the migration can safely drop the old table after copying rows.

- [ ] **Step 6: Apply and regenerate types**

```bash
npx supabase db reset
npx supabase gen types typescript --local > src/types/database.ts
pnpm typecheck
```

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/202608200004_recurrence_series.sql src/types/database.ts
git commit -m "refactor: model recurring task series and occurrences"
```

---

### Task 2: Reminder calculation domain

**Files:**
- Create: `src/lib/reminders/calculate.ts`
- Test: `src/lib/reminders/calculate.test.ts`

**Interfaces:**
- Produces:
```ts
calculateRemindAt(dueAt: Date, offsetMinutes: number): Date
recalculateReminderRows(dueAt, offsets)
```

- [ ] **Step 1: Write failing tests**

Examples:
```text
due 18:00 + offset 60 => 17:00
due 18:00 + offset 1440 => previous day 18:00
offset 0 => due timestamp
```

- [ ] **Step 2: Run FAIL**

```bash
pnpm test:run src/lib/reminders/calculate.test.ts
```

- [ ] **Step 3: Implement pure functions**

Operate on absolute timestamps; presentation remains Asia/Ho_Chi_Minh.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test:run src/lib/reminders/calculate.test.ts
git add src/lib/reminders
git commit -m "feat: add reminder timestamp calculation"
```

---

### Task 3: Recurrence next-occurrence calculation

**Files:**
- Create: `src/lib/recurrence/types.ts`
- Create: `src/lib/recurrence/next-occurrence.ts`
- Test: `src/lib/recurrence/next-occurrence.test.ts`

**Interfaces:**
- Produces:
```ts
type RecurrenceRule = {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  weekdays?: number[];
  monthDay?: number | null;
  endsAt?: Date | null;
};

nextOccurrence(rule, current, zone): Date | null;
```

- [ ] **Step 1: Write daily tests**

Every day and every 2 days.

- [ ] **Step 2: Write weekly tests**

Monday + Wednesday series advances to the next configured weekday.

- [ ] **Step 3: Write monthly tests**

Day 31 in a month without day 31 must use the last valid day of that month for V1, and continue targeting day 31 in later months.

- [ ] **Step 4: Write yearly leap-day test**

A Feb 29 yearly occurrence uses Feb 28 in non-leap years for V1.

- [ ] **Step 5: Implement deterministic calculator**

Use a timezone-capable date library:
```bash
pnpm add date-fns date-fns-tz
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm test:run src/lib/recurrence/next-occurrence.test.ts
git add src/lib/recurrence package.json pnpm-lock.yaml
git commit -m "feat: calculate recurring task occurrences"
```

---

### Task 4: Create recurring series and materialize first/next task

**Files:**
- Create: `src/lib/recurrence/materialize.ts`
- Create: `src/actions/recurrence-actions.ts`
- Test: `src/actions/recurrence-actions.test.ts`

**Interfaces:**
- Produces:
```ts
createRecurrenceSeries(taskId, rule)
ensureNextOccurrence(seriesId)
removeFutureRecurrence(seriesId, fromOccurrence)
```

- [ ] **Step 1: Write failing materialization test**

Given source task `Gym`, daily 18:00:
- existing 20/8 occurrence;
- ensure next creates 21/8 occurrence;
- repeated ensure does not duplicate 21/8 due to unique index.

- [ ] **Step 2: Implement transaction/RPC**

Create Postgres function or server transaction semantics:
1. load series + latest occurrence;
2. calculate next;
3. clone task core fields;
4. set `recurrence_series_id`;
5. set `occurrence_start_at`;
6. clone reminder offsets;
7. handle unique conflict as idempotent success.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test:run src/actions/recurrence-actions.test.ts
git add src/lib/recurrence/materialize.ts src/actions/recurrence-actions.ts
git commit -m "feat: materialize recurring task occurrences"
```

---

### Task 5: Recurrence edit semantics

**Files:**
- Create: `src/components/calendar/recurrence-edit-dialog.tsx`
- Extend: `src/actions/recurrence-actions.ts`
- Test: `src/actions/recurrence-actions.test.ts`

**Interfaces:**
- Produces:
```ts
updateOccurrenceOnly(taskId, patch)
updateThisAndFuture(taskId, patch)
```

- [ ] **Step 1: Write failing “occurrence only” test**

Expected:
- current task changed;
- `recurrence_exception = true`;
- series rule unchanged;
- future occurrences unchanged.

- [ ] **Step 2: Write failing “this and future” test**

Expected:
- split series at selected occurrence;
- old series ends immediately before selected occurrence;
- new series starts with selected occurrence using updated schedule;
- past occurrences unchanged.

- [ ] **Step 3: Implement split semantics**

Do not mutate historical rows.

- [ ] **Step 4: Implement Vietnamese dialog**

Buttons:
```text
Chỉ lần này
Lần này và các lần sau
Hủy
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm test:run src/actions/recurrence-actions.test.ts
git add src/actions/recurrence-actions.ts src/components/calendar/recurrence-edit-dialog.tsx
git commit -m "feat: edit recurring task occurrences safely"
```

---

### Task 6: Reminder settings and task overrides

**Files:**
- Create: `src/actions/reminder-actions.ts`
- Create: `src/components/tasks/reminder-editor.tsx`
- Modify: `src/components/settings/...`
- Test: `src/actions/reminder-actions.test.ts`

**Interfaces:**
- Produces:
```ts
setTaskReminderOffsets(taskId, offsets)
setDefaultReminderOffsets(offsets)
```

- [ ] **Step 1: Add settings storage for multiple defaults**

Migration or JSONB column:
```sql
default_reminder_offsets integer[] not null default array[1440, 0]
```
on `user_settings`.

- [ ] **Step 2: Write failing override test**

A task with offsets `[4320, 60, 0]` creates exactly 3 reminder rows based on current due date.

- [ ] **Step 3: Implement reminder replacement atomically**

Delete untriggered future reminder rows and insert recalculated rows. Never resurrect already-triggered historical notification rows.

- [ ] **Step 4: Build editor**

Preset labels:
```text
10 phút trước
1 giờ trước
1 ngày trước
3 ngày trước
Đúng hạn
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm test:run src/actions/reminder-actions.test.ts
git add src/actions/reminder-actions.ts src/components/tasks/reminder-editor.tsx src/components/settings supabase/migrations
git commit -m "feat: add default and per-task reminders"
```

---

### Task 7: Calendar actions with reminder/Eisenhower consistency

**Files:**
- Create: `src/actions/calendar-actions.ts`
- Test: `src/actions/calendar-actions.test.ts`

**Interfaces:**
- Produces:
```ts
moveCalendarTask(taskId, { startAt, dueAt, allDay })
resizeCalendarTask(taskId, { startAt, dueAt })
```

- [ ] **Step 1: Write failing consistency test**

Moving a task:
- updates timestamps;
- recomputes every untriggered reminder from offsets;
- recomputes Eisenhower if `eisenhower_override=false`;
- preserves manual flags if override=true.

- [ ] **Step 2: Implement atomic server operation**

Prefer one Postgres RPC if updates span task + reminders, to avoid partial state.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test:run src/actions/calendar-actions.test.ts
git add src/actions/calendar-actions.ts
git commit -m "feat: keep calendar moves consistent"
```

---

### Task 8: FullCalendar Month/Week/Day UI

**Files:**
- Create: `src/app/(dashboard)/app/lich/page.tsx`
- Create: `src/components/calendar/task-calendar.tsx`
- Create: `src/components/calendar/calendar-agenda-mobile.tsx`
- Test: `src/components/calendar/task-calendar.test.tsx`

**Interfaces:**
- Consumes calendar actions.
- Produces Month/Week/Day calendar.

- [ ] **Step 1: Install FullCalendar**

```bash
pnpm add @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/react
```

- [ ] **Step 2: Write mapping test**

Assert:
- all-day task maps `allDay: true`;
- timed task maps start/end;
- title preserved.

- [ ] **Step 3: Implement Calendar**

Buttons rendered in Vietnamese:
```text
Tháng
Tuần
Ngày
Hôm nay
```

- [ ] **Step 4: Wire drag and resize**

On drag:
- optimistic move;
- recurring dialog if series member;
- server update;
- rollback on failure.

- [ ] **Step 5: Mobile agenda**

Below 768px default to agenda/list optimized display, while allowing Month view switch.

- [ ] **Step 6: Verify and commit**

```bash
pnpm test:run src/components/calendar/task-calendar.test.tsx
pnpm typecheck
git add src/app/\(dashboard\)/app/lich src/components/calendar package.json pnpm-lock.yaml
git commit -m "feat: add interactive calendar"
```

---

### Task 9: Notification job SQL

**Files:**
- Create: `supabase/migrations/202608200005_notification_jobs.sql`
- Test: `supabase/tests/notification_jobs.sql`

**Interfaces:**
- Produces DB functions:
```sql
public.process_due_reminders()
public.process_due_today_notifications()
public.process_overdue_notifications()
public.process_recurring_occurrences()
```

- [ ] **Step 1: Write reminder idempotency test**

Insert due reminder, run function twice.
Expected:
- exactly one notification;
- `triggered_at` set once.

- [ ] **Step 2: Implement reminder job**

Use transaction-safe update/insert and `for update skip locked` if processing batches. Join `user_settings` and skip users with `notify_reminder = false`.

Core SQL shape:
```sql
select r.*
from public.task_reminders r
join public.user_settings s on s.user_id = r.user_id
where r.remind_at <= now()
  and r.triggered_at is null
  and s.notify_reminder = true
for update skip locked;
```

- [ ] **Step 3: Write due-today aggregation test**

For a user with 3 open tasks due today and `notify_due_today = true`, running `process_due_today_notifications()` twice on the same Vietnam-local date creates exactly one `DUE_TODAY` notification whose message is `Bạn có 3 công việc đến hạn hôm nay.`. A user with `notify_due_today = false` gets none.

Use a deterministic `dedupe_key` such as:
```text
due-today:<user-id>:2026-08-20
```

- [ ] **Step 4: Implement due-today job**

Compute the local date with:
```sql
(now() at time zone 'Asia/Ho_Chi_Minh')::date
```
and count only tasks not in `DONE`/`CANCELLED`.

- [ ] **Step 5: Write overdue idempotency test**

Add uniqueness metadata so a task/occurrence gets one `OVERDUE` notification only. Use unique index or `dedupe_key`.

- [ ] **Step 6: Implement overdue job**

Exclude DONE/CANCELLED and skip users with `notify_overdue = false`.

- [ ] **Step 7: Implement recurrence ensure job**

Call recurrence materialization for series whose next occurrence should exist. When a new occurrence is created, insert `RECURRING_CREATED` only when that user's `notify_recurring = true`; use a dedupe key tied to the occurrence ID.

- [ ] **Step 8: Verify local SQL**

```bash
npx supabase db reset
```

Expected: all notification job assertions pass.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/202608200005_notification_jobs.sql supabase/tests/notification_jobs.sql
git commit -m "feat: add reminder and recurrence jobs"
```

---

### Task 10: Configure Supabase Cron

**Files:**
- Create: `supabase/migrations/202608200006_cron_schedule.sql`
- Create: `docs/operations/cron.md`

**Interfaces:**
- Schedules server-side processing.

- [ ] **Step 1: Enable pg_cron migration**

Use:
```sql
create extension if not exists pg_cron with schema extensions;
```

- [ ] **Step 2: Schedule reminder/overdue processor**

Every 5 minutes:
```sql
select cron.schedule(
  'task-reminder-processor',
  '*/5 * * * *',
  $$select public.process_due_reminders(); select public.process_overdue_notifications();$$
);
```

- [ ] **Step 3: Schedule due-today processor**

Supabase databases are kept in UTC; 00:00 UTC corresponds to 07:00 in Ho Chi Minh City:
```sql
select cron.schedule(
  'task-due-today-processor',
  '0 0 * * *',
  $$select public.process_due_today_notifications();$$
);
```

- [ ] **Step 4: Schedule recurrence processor**

Hourly:
```sql
select cron.schedule(
  'task-recurrence-processor',
  '7 * * * *',
  $$select public.process_recurring_occurrences();$$
);
```

- [ ] **Step 5: Document verification queries**

`docs/operations/cron.md` includes:
```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```

- [ ] **Step 6: Apply and commit**

```bash
npx supabase db reset
git add supabase/migrations/202608200006_cron_schedule.sql docs/operations/cron.md
git commit -m "ops: schedule reminder and recurrence jobs"
```

---

### Task 11: Notification actions and popover

**Files:**
- Create: `src/actions/notification-actions.ts`
- Create: `src/components/notifications/notification-popover.tsx`
- Modify: `src/components/layout/top-bar.tsx`
- Test: `src/actions/notification-actions.test.ts`

**Interfaces:**
- Produces:
```ts
listNotifications()
markNotificationRead(id)
markAllNotificationsRead()
deleteNotification(id)
clearReadNotifications()
```

- [ ] **Step 1: Write ownership tests**

User B cannot mutate user A notification.

- [ ] **Step 2: Implement actions**

All operations scope to authenticated user.

- [ ] **Step 3: Build top-bar popover**

Vietnamese:
```text
Thông báo
Đánh dấu tất cả đã đọc
Xem tất cả
```

Badge = unread count.

- [ ] **Step 4: Click notification opens Task Detail**

If task was deleted, open notification center without crashing and show `Công việc này không còn tồn tại.`

- [ ] **Step 5: Verify and commit**

```bash
pnpm test:run src/actions/notification-actions.test.ts
git add src/actions/notification-actions.ts src/components/notifications src/components/layout/top-bar.tsx
git commit -m "feat: add in-app notification popover"
```

---

### Task 12: Notification Center

**Files:**
- Create: `src/app/(dashboard)/app/thong-bao/page.tsx`
- Create: `src/components/notifications/notification-list.tsx`
- Test: `src/components/notifications/notification-list.test.tsx`

**Interfaces:**
- Consumes notification actions.
- Produces full history view.

- [ ] **Step 1: Write failing grouping test**

Notifications group under:
```text
Hôm nay
Hôm qua
Trước đó
```

- [ ] **Step 2: Implement tabs**

```text
Tất cả
Chưa đọc
```

- [ ] **Step 3: Implement mutations**

Buttons:
```text
Đánh dấu đã đọc
Xóa
Xóa thông báo đã đọc
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm test:run src/components/notifications/notification-list.test.tsx
git add src/app/\(dashboard\)/app/thong-bao src/components/notifications/notification-list.tsx
git commit -m "feat: add notification center"
```

---

## Plan 3 Completion Gate

Run:
```bash
pnpm test:run
pnpm typecheck
pnpm lint
pnpm build
npx supabase db reset
```

Manual acceptance:
1. Month/Week/Day calendar renders Vietnamese UI.
2. Drag/resize changes dates and reminder timestamps.
3. Recurring task produces next occurrences without duplicates.
4. “Chỉ lần này” preserves series; “Lần này và các lần sau” splits future schedule.
5. Browser may be closed; cron still creates notification rows.
6. Reminder and overdue jobs are idempotent.
7. Notification badge and center operate only on current user's data.

Commit:
```bash
git add .
git commit -m "chore: complete calendar recurrence and reminders milestone"
```