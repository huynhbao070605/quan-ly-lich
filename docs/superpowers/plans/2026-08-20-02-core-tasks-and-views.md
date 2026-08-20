# Core Tasks & Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện quản lý công việc cá nhân: CRUD task, dự án, thẻ, checklist, list/table, dashboard, Kanban, Eisenhower, Daily Plan, Today's Focus, Weekly Plan và tìm kiếm/lọc.

**Architecture:** Tất cả view đọc cùng bảng `tasks`; không tạo database riêng cho Kanban/Eisenhower/Daily/Weekly. Server actions kiểm tra Zod + authenticated user; UI dùng optimistic updates chỉ ở thao tác tương tác như status/ordering.

**Tech Stack:** Next.js, TypeScript, Supabase, Zod, dnd-kit, Recharts, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-20-personal-productivity-app-v1-design.md`

## Global Constraints

- UI người dùng hoàn toàn bằng tiếng Việt.
- Một task chỉ lưu một lần; mọi view dùng cùng nguồn dữ liệu.
- Status: `TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`.
- Priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- Eisenhower Auto: `HIGH|URGENT` gợi ý Important; deadline <= 24 giờ hoặc overdue gợi ý Urgent.
- Manual Eisenhower override không bị deadline/priority tự ghi đè.
- Today's Focus tối đa 3 task/ngày.
- Daily Plan gồm due today, start today, overdue, recurring occurrence hôm nay.
- Task cha được phép Done dù checklist chưa hoàn tất.
- Timezone: `Asia/Ho_Chi_Minh`.

---

## File Map

- `src/lib/validation/task.ts`
- `src/lib/tasks/task-repository.ts`
- `src/lib/tasks/task-queries.ts`
- `src/lib/tasks/eisenhower.ts`
- `src/lib/tasks/focus.ts`
- `src/actions/task-actions.ts`
- `src/actions/project-actions.ts`
- `src/actions/tag-actions.ts`
- `src/actions/subtask-actions.ts`
- `src/components/tasks/quick-add-task.tsx`
- `src/components/tasks/task-list.tsx`
- `src/components/tasks/task-table.tsx`
- `src/components/tasks/task-detail-sheet.tsx`
- `src/components/tasks/task-filters.tsx`
- `src/app/(dashboard)/app/cong-viec/page.tsx`
- `src/app/(dashboard)/app/du-an/page.tsx`
- `src/app/(dashboard)/app/du-an/[id]/page.tsx`
- `src/app/(dashboard)/app/tong-quan/page.tsx`
- `src/app/(dashboard)/app/kanban/page.tsx`
- `src/app/(dashboard)/app/eisenhower/page.tsx`
- `src/app/(dashboard)/app/ke-hoach-ngay/page.tsx`
- `src/app/(dashboard)/app/ke-hoach-tuan/page.tsx`

---

### Task 1: Task validation contract

**Files:**
- Create: `src/lib/validation/task.ts`
- Test: `src/lib/validation/task.test.ts`

**Interfaces:**
- Produces `createTaskSchema`, `updateTaskSchema`, `taskFilterSchema`.

- [ ] **Step 1: Write failing tests**

Cover:
```ts
createTaskSchema.safeParse({ title: "Nộp báo cáo" }).success === true
createTaskSchema.safeParse({ title: "" }).success === false
createTaskSchema.safeParse({ title: "x".repeat(201) }).success === false
```

Also reject invalid status/priority.

- [ ] **Step 2: Run FAIL**

```bash
pnpm test:run src/lib/validation/task.test.ts
```

- [ ] **Step 3: Implement schemas**

Use explicit enums:
```ts
z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"])
z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
```

Allow `projectId`, `description`, `startAt`, `dueAt`, `allDay`, tag IDs, `important`, `urgent`, `eisenhowerOverride`.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test:run src/lib/validation/task.test.ts
git add src/lib/validation/task*
git commit -m "feat: define task validation contract"
```

---

### Task 2: Eisenhower domain logic

**Files:**
- Create: `src/lib/tasks/eisenhower.ts`
- Test: `src/lib/tasks/eisenhower.test.ts`

**Interfaces:**
- Produces:
```ts
type EisenhowerFlags = { important: boolean; urgent: boolean };
suggestEisenhower(input): EisenhowerFlags;
quadrantFromFlags(flags): "DO_NOW" | "SCHEDULE" | "DELEGATE" | "ELIMINATE";
```

- [ ] **Step 1: Write failing table-driven test**

Cases:
```text
HIGH + due in 2h => DO_NOW
HIGH + due in 3d => SCHEDULE
LOW + due in 2h => DELEGATE
LOW + no due => ELIMINATE
overdue TODO => urgent true
DONE overdue => urgent false
```

- [ ] **Step 2: Run FAIL**

```bash
pnpm test:run src/lib/tasks/eisenhower.test.ts
```

- [ ] **Step 3: Implement minimal deterministic logic**

Use `now` injected into function for deterministic tests. Deadline threshold exactly 24 hours.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test:run src/lib/tasks/eisenhower.test.ts
git add src/lib/tasks/eisenhower*
git commit -m "feat: add eisenhower suggestion logic"
```

---

### Task 3: Task repository and secure CRUD actions

**Files:**
- Create: `src/lib/tasks/task-repository.ts`
- Create: `src/actions/task-actions.ts`
- Test: `src/actions/task-actions.test.ts`

**Interfaces:**
- Produces:
```ts
createTask(input)
updateTask(taskId, input)
deleteTask(taskId)
setTaskStatus(taskId, status)
getTaskById(taskId)
```

- [ ] **Step 1: Write failing action tests with mocked repository**

Test:
- create ignores any client-provided `userId`;
- DONE sets `completed_at`;
- moving DONE → IN_PROGRESS clears `completed_at`;
- update priority recalculates Eisenhower only when override=false.

- [ ] **Step 2: Run FAIL**

```bash
pnpm test:run src/actions/task-actions.test.ts
```

- [ ] **Step 3: Implement repository**

Repository accepts authenticated `userId` only from server caller and always scopes:
```ts
.eq("user_id", userId)
```

- [ ] **Step 4: Implement actions**

Call `requireUser()`, parse Zod, invoke repository. Return typed result:
```ts
{ ok: true, data }
| { ok: false, message: string }
```

Vietnamese error copy only.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test:run src/actions/task-actions.test.ts
pnpm typecheck
git add src/lib/tasks src/actions/task-actions.ts
git commit -m "feat: add secure task crud actions"
```

---

### Task 4: Projects and tags

**Files:**
- Create: `src/actions/project-actions.ts`
- Create: `src/actions/tag-actions.ts`
- Create: `src/app/(dashboard)/app/du-an/page.tsx`
- Create: `src/app/(dashboard)/app/du-an/[id]/page.tsx`
- Test: `src/actions/project-actions.test.ts`

**Interfaces:**
- Produces:
```ts
createProject({ name, color, icon })
archiveProject(projectId)
deleteProject(projectId)
createTag({ name, color })
deleteTag(tagId)
```

- [ ] **Step 1: Write failing delete-project test**

Assert deleting project:
- deletes project row;
- leaves task row intact;
- task `project_id` becomes null via FK `ON DELETE SET NULL`.

- [ ] **Step 2: Implement validated actions**

Names trimmed and capped; user ownership from auth only.

- [ ] **Step 3: Build Projects page**

Vietnamese UI:
```text
Dự án
+ Dự án mới
Đang hoạt động
Đã lưu trữ
```

Cards show task count, done count, completion percentage.

- [ ] **Step 4: Build project detail**

Tabs:
```text
Tổng quan
Công việc
```
Links:
```text
Xem trong Kanban
Xem trong Lịch
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm test:run src/actions/project-actions.test.ts
pnpm typecheck
git add src/actions/project-actions.ts src/actions/tag-actions.ts src/app/\(dashboard\)/app/du-an
git commit -m "feat: add projects and tags"
```

---

### Task 5: Subtask/checklist actions

**Files:**
- Create: `src/actions/subtask-actions.ts`
- Create: `src/components/tasks/subtask-list.tsx`
- Test: `src/actions/subtask-actions.test.ts`

**Interfaces:**
- Produces:
```ts
addSubtask(taskId, title)
toggleSubtask(subtaskId, completed)
reorderSubtasks(taskId, orderedIds)
deleteSubtask(subtaskId)
```

- [ ] **Step 1: Write failing ownership + reorder tests**

Assert cross-user child operation is rejected and reorder writes positions `0..n-1`.

- [ ] **Step 2: Implement actions**

Verify parent task ownership before mutation.

- [ ] **Step 3: Build checklist UI**

Show:
```text
Danh sách kiểm tra 2/4
```
and `+ Thêm mục`.

- [ ] **Step 4: Verify parent task can still be Done at 2/4**

Unit test status action; no guard blocks completion.

- [ ] **Step 5: Commit**

```bash
git add src/actions/subtask-actions.ts src/components/tasks/subtask-list.tsx src/actions/subtask-actions.test.ts
git commit -m "feat: add task checklists"
```

---

### Task 6: Quick Add and Task Detail

**Files:**
- Create: `src/components/tasks/quick-add-task.tsx`
- Create: `src/components/tasks/task-detail-sheet.tsx`
- Test: `src/components/tasks/quick-add-task.test.tsx`

**Interfaces:**
- Consumes task/project/tag/subtask actions.
- Produces global `+ Công việc mới` workflow and detail editor.

- [ ] **Step 1: Write failing Quick Add test**

Assert initial form shows only:
```text
Tên công việc
Ngày
Ưu tiên
Dự án
Thêm tùy chọn
```
and does not show `Lặp lại` before expansion.

- [ ] **Step 2: Implement Quick Add**

Submit title with default priority/settings. Pressing Enter submits when IME composition is not active.

- [ ] **Step 3: Implement detail side sheet**

Desktop: sheet.
Mobile: full-screen dialog.
Fields in Vietnamese from spec.

- [ ] **Step 4: Verify**

```bash
pnpm test:run src/components/tasks/quick-add-task.test.tsx
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks
git commit -m "feat: add quick task creation and detail editor"
```

---

### Task 7: Task queries, filtering and search

**Files:**
- Create: `src/lib/tasks/task-queries.ts`
- Create: `src/components/tasks/task-filters.tsx`
- Test: `src/lib/tasks/task-queries.test.ts`

**Interfaces:**
- Produces:
```ts
listTasks(userId, filters)
searchTasks(userId, query)
```

Filters: project, tag, priority, status, today, upcoming, overdue.

- [ ] **Step 1: Write failing query-builder tests**

Assert search trims query and scopes by current user. Overdue excludes DONE/CANCELLED.

- [ ] **Step 2: Implement server query builder**

Use Supabase query conditions; avoid fetching all tasks to filter in browser.

- [ ] **Step 3: Build filter bar**

Vietnamese controls:
```text
Tìm kiếm
Dự án
Thẻ
Ưu tiên
Trạng thái
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm test:run src/lib/tasks/task-queries.test.ts
git add src/lib/tasks/task-queries* src/components/tasks/task-filters.tsx
git commit -m "feat: add task search and filters"
```

---

### Task 8: Task List and Table views

**Files:**
- Create: `src/app/(dashboard)/app/cong-viec/page.tsx`
- Create: `src/components/tasks/task-list.tsx`
- Create: `src/components/tasks/task-table.tsx`
- Test: `src/components/tasks/task-list.test.tsx`

**Interfaces:**
- Consumes `listTasks`.
- Produces List/Table toggle and quick tabs.

- [ ] **Step 1: Write failing list test**

Assert title, Vietnamese status/priority, due date, project and max two tags render.

- [ ] **Step 2: Implement List view**

Tabs:
```text
Tất cả
Hôm nay
Sắp tới
Quá hạn
```

- [ ] **Step 3: Implement Table view**

Columns:
```text
Công việc
Dự án
Ưu tiên
Trạng thái
Hạn chót
```

- [ ] **Step 4: Add empty/loading states**

Copy:
```text
Chưa có công việc
Tạo công việc đầu tiên để bắt đầu.
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm test:run src/components/tasks/task-list.test.tsx
pnpm typecheck
git add src/app/\(dashboard\)/app/cong-viec src/components/tasks/task-list.tsx src/components/tasks/task-table.tsx
git commit -m "feat: add task list and table views"
```

---

### Task 9: Dashboard aggregates

**Files:**
- Create: `src/lib/dashboard/queries.ts`
- Modify: `src/app/(dashboard)/app/tong-quan/page.tsx`
- Create: `src/components/dashboard/summary-cards.tsx`
- Create: `src/components/dashboard/project-progress.tsx`
- Test: `src/lib/dashboard/queries.test.ts`

**Interfaces:**
- Produces `getDashboardSummary(userId, now)`.

- [ ] **Step 1: Install chart dependency**

```bash
pnpm add recharts
```

- [ ] **Step 2: Write aggregate tests**

Fixture expectations:
- today count;
- in-progress count;
- overdue count;
- completion percentage;
- upcoming list;
- project progress.

- [ ] **Step 3: Implement database-backed aggregates**

No analytics table. Query tasks/projects directly.

- [ ] **Step 4: Build Dashboard**

Vietnamese cards:
```text
Hôm nay
Đang thực hiện
Quá hạn
Hoàn thành
```

Show `Cần chú ý` only if overdue > 0.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test:run src/lib/dashboard/queries.test.ts
git add src/lib/dashboard src/app/\(dashboard\)/app/tong-quan src/components/dashboard
git commit -m "feat: add productivity dashboard"
```

---

### Task 10: Kanban drag/drop

**Files:**
- Create: `src/app/(dashboard)/app/kanban/page.tsx`
- Create: `src/components/kanban/kanban-board.tsx`
- Create: `src/components/kanban/kanban-column.tsx`
- Create: `src/components/kanban/task-card.tsx`
- Create: `src/actions/kanban-actions.ts`
- Test: `src/actions/kanban-actions.test.ts`

**Interfaces:**
- Produces:
```ts
moveTask(taskId, status, position)
reorderColumn(status, orderedTaskIds)
```

- [ ] **Step 1: Install dnd-kit**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Write failing move tests**

DONE sets completion timestamp; moving out clears it; ordering persists numeric positions.

- [ ] **Step 3: Implement actions**

Use authenticated user and transaction/RPC if multiple rows reordered together.

- [ ] **Step 4: Build 4-column board**

Labels:
```text
Cần làm
Đang thực hiện
Hoàn thành
Đã hủy
```

- [ ] **Step 5: Implement optimistic drag rollback**

On failed server result:
- restore previous local state;
- toast `Không thể cập nhật công việc. Vui lòng thử lại.`

- [ ] **Step 6: Verify and commit**

```bash
pnpm test:run src/actions/kanban-actions.test.ts
pnpm typecheck
git add src/app/\(dashboard\)/app/kanban src/components/kanban src/actions/kanban-actions.ts
git commit -m "feat: add kanban drag and drop"
```

---

### Task 11: Eisenhower matrix interactions

**Files:**
- Create: `src/app/(dashboard)/app/eisenhower/page.tsx`
- Create: `src/components/eisenhower/eisenhower-board.tsx`
- Create: `src/actions/eisenhower-actions.ts`
- Test: `src/actions/eisenhower-actions.test.ts`

**Interfaces:**
- Produces:
```ts
overrideEisenhower(taskId, flags)
resetEisenhower(taskId)
```

- [ ] **Step 1: Write failing override tests**

Assert:
```text
drag to DO_NOW => important=true, urgent=true, override=true
reset => override=false and values recomputed from current priority/deadline
```

- [ ] **Step 2: Implement actions**

Use shared `suggestEisenhower`.

- [ ] **Step 3: Build 2x2 desktop matrix**

Quadrants:
```text
Làm ngay
Lên lịch
Ủy quyền
Loại bỏ
```

Hide DONE/CANCELLED by default.

- [ ] **Step 4: Build mobile tabs**

Each quadrant becomes a swipe/tab-compatible list.

- [ ] **Step 5: Add Auto/Manual indicator**

Use Vietnamese tooltip:
```text
Tự động
Đã chỉnh thủ công
Đặt lại theo gợi ý
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm test:run src/actions/eisenhower-actions.test.ts
git add src/app/\(dashboard\)/app/eisenhower src/components/eisenhower src/actions/eisenhower-actions.ts
git commit -m "feat: add eisenhower matrix"
```

---

### Task 12: Daily Plan and Today's Focus

**Files:**
- Create: `src/lib/tasks/daily-plan.ts`
- Create: `src/lib/tasks/focus.ts`
- Create: `src/actions/focus-actions.ts`
- Create: `src/app/(dashboard)/app/ke-hoach-ngay/page.tsx`
- Test: `src/lib/tasks/daily-plan.test.ts`
- Test: `src/actions/focus-actions.test.ts`

**Interfaces:**
- Produces:
```ts
isTaskInDailyPlan(task, date)
setFocus(taskId, date, position)
removeFocus(taskId)
reorderFocus(date, orderedTaskIds)
```

- [ ] **Step 1: Write Daily Plan inclusion tests**

Cases:
- due today → included;
- start today, due later → included today;
- start yesterday, due tomorrow → not included today;
- overdue → included;
- DONE today → included in completed group.

- [ ] **Step 2: Implement Daily Plan helper/query**

Use Vietnam timezone date boundaries.

- [ ] **Step 3: Write focus limit failing test**

Attempt fourth focus item on same day returns:
```text
Bạn chỉ có thể chọn tối đa 3 công việc trọng tâm mỗi ngày.
```

- [ ] **Step 4: Implement focus actions**

Enforce max 3 server-side, not only UI.

- [ ] **Step 5: Build Daily page**

Groups:
```text
Trọng tâm hôm nay
Quá hạn
Hôm nay
Cả ngày
Hoàn thành
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm test:run src/lib/tasks/daily-plan.test.ts src/actions/focus-actions.test.ts
git add src/lib/tasks/daily-plan.ts src/lib/tasks/focus.ts src/actions/focus-actions.ts src/app/\(dashboard\)/app/ke-hoach-ngay
git commit -m "feat: add daily plan and focus"
```

---

### Task 13: Weekly Plan and workload

**Files:**
- Create: `src/lib/tasks/weekly-plan.ts`
- Create: `src/app/(dashboard)/app/ke-hoach-tuan/page.tsx`
- Create: `src/components/weekly/weekly-board.tsx`
- Create: `src/components/weekly/weekly-agenda.tsx`
- Test: `src/lib/tasks/weekly-plan.test.ts`

**Interfaces:**
- Produces:
```ts
getWeekRange(date)
groupTasksByVietnamDay(tasks, week)
getWorkloadLevel(openTaskCount): "normal" | "heavy"
```

- [ ] **Step 1: Write week boundary tests**

Week starts Monday. Verify 20/08/2026 belongs to Monday 17/08 through Sunday 23/08 in Asia/Ho_Chi_Minh.

- [ ] **Step 2: Write workload test**

```ts
expect(getWorkloadLevel(6)).toBe("normal");
expect(getWorkloadLevel(7)).toBe("heavy");
```

- [ ] **Step 3: Implement helpers**

- [ ] **Step 4: Build Board + Agenda**

Mobile defaults to Agenda.

- [ ] **Step 5: Show weekly progress**

Display total, completed, overdue, and project progress.

- [ ] **Step 6: Verify and commit**

```bash
pnpm test:run src/lib/tasks/weekly-plan.test.ts
git add src/lib/tasks/weekly-plan.ts src/app/\(dashboard\)/app/ke-hoach-tuan src/components/weekly
git commit -m "feat: add weekly planning views"
```

---

### Task 14: Global search

**Files:**
- Create: `src/components/search/global-search.tsx`
- Create: `src/actions/search-actions.ts`
- Test: `src/components/search/global-search.test.tsx`

**Interfaces:**
- Produces search across task title/description/project/tag.

- [ ] **Step 1: Write keyboard test**

Pressing `/` outside an input focuses `Tìm công việc...`.

- [ ] **Step 2: Implement debounced search**

Minimum query length 1; server scopes results by current user.

- [ ] **Step 3: Render grouped results**

Groups:
```text
Công việc
Dự án
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm test:run src/components/search/global-search.test.tsx
git add src/components/search src/actions/search-actions.ts
git commit -m "feat: add global task search"
```

---

## Plan 2 Completion Gate

Run:
```bash
pnpm test:run
pnpm typecheck
pnpm lint
pnpm build
```

Manual acceptance:
1. Create/edit/delete task.
2. Add project, tags and checklist.
3. Same task appears consistently across List, Dashboard, Kanban, Eisenhower, Daily, Weekly.
4. Kanban drag updates status and completion timestamp.
5. Eisenhower Auto/Manual rules behave correctly.
6. Focus refuses a fourth daily item.
7. Search never returns another user's data.

Commit:
```bash
git add .
git commit -m "chore: complete core tasks and views milestone"
```