# Release checklist

## Automated checks

```bash
corepack pnpm test:run
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm security:check
corepack pnpm build
corepack pnpm exec playwright test
```

## Deferred live database checks

Status: **DEFERRED LIVE DB/RLS VERIFICATION** until a safe Supabase database environment is intentionally enabled.

Required live checks:

- Migrations apply from zero.
- RLS smoke tests block cross-user reads and writes.
- Cron jobs are present:

```sql
select * from cron.job;
```

- Reminder, due-today, overdue and recurring notification jobs execute correctly.
- Performance EXPLAIN checks from `docs/operations/performance.md`.

## Deferred live auth/browser checks

Status: **DEFERRED LIVE AUTH E2E** until live Supabase auth credentials or storage states are provided.

Required checks:

- Protected routes redirect unauthenticated users to `/dang-nhap`.
- Email sign-up/sign-in works with the production Supabase project.
- Google OAuth starts and returns to `https://<domain>/auth/callback`.
- Core task workflow E2E passes with an authenticated browser state.
- Cross-user security E2E passes with two separate authenticated browser states.

## Manual smoke

- Vietnamese UI on desktop and mobile.
- Quick Add.
- List, Kanban, Calendar, Eisenhower, Daily Plan and Weekly Plan all show the same task data.
- Recurring task editing preserves occurrence history.
- In-app notification list and popover.
- Dark, light and system themes.
- PWA installability in a production browser session.
