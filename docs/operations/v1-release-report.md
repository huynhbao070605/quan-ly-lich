# V1 release candidate report

Date: 2026-08-24

Branch: `plan-04-pwa-hardening-release`

Verified implementation SHA before this report: `cb95d96`

## Non-Docker verification

| Check | Result |
| --- | --- |
| `corepack pnpm test:run` | PASS: 60 files, 213 tests |
| `corepack pnpm typecheck` | PASS |
| `corepack pnpm lint` | PASS with 2 existing warnings in `src/lib/recurrence/next-occurrence.ts` |
| `corepack pnpm security:check` | PASS: secret scan passed |
| `corepack pnpm build` | PASS |
| `corepack pnpm exec playwright test` | PASS: 5 passed, 13 skipped/deferred |
| `schema_static_audit.ps1` | PASS |
| `rls_static_audit.ps1` | PASS |
| `profile_bootstrap_static_audit.ps1` | PASS |
| `notification_jobs_static_audit.ps1` | PASS |
| `recurrence_schema_static_audit.ps1` | PASS |

## Playwright coverage

Passed:

- Login page Google OAuth button is visible.
- Login page has no serious or critical axe violations.
- Login page has no horizontal overflow at 390x844, 820x1180 and 1440x900.

Skipped/deferred:

- Protected route redirect without public Supabase env.
- Live email sign-in.
- Authenticated responsive shell checks.
- Authenticated axe checks for task list, dashboard and settings.
- Core task workflow E2E.
- Kanban/Eisenhower/Calendar cross-view E2E.
- Cross-user security E2E.

## Deferred verification

Status: **DEFERRED LIVE DB/RLS VERIFICATION**.

Not run on this machine:

- `npx supabase db reset`
- SQL smoke suites: `schema_smoke.sql`, `rls.sql`, `notification_jobs.sql`, `recurrence_schema.sql`
- Cross-user RLS runtime checks.
- Cron job runtime check: `select * from cron.job;`
- Performance `EXPLAIN ANALYZE` checks.

Status: **DEFERRED LIVE AUTH E2E**.

Not run without live Supabase auth credentials/storage states:

- Protected route redirect through real Supabase auth middleware.
- Email signup/login.
- Core authenticated browser workflows.
- Two-user browser security fixture.

Status: **DEFERRED PRODUCTION PWA SMOKE**.

Not run without a production deployment:

- Browser installability prompt.
- Service worker active state in DevTools Application panel.
- Production mobile/desktop manual smoke.

## Cron jobs expected

- `process_due_reminders`
- `process_overdue_notifications`
- `process_due_today_notifications`
- `process_recurring_occurrences`

## Remaining technical debt

- Live database/RLS verification remains deferred because local Supabase/Docker is disabled on this machine.
- Authenticated Playwright workflows remain deferred until live auth states or test credentials are supplied.
- Production PWA installability remains deferred until deployment.
- Lint reports 2 pre-existing warnings in `src/lib/recurrence/next-occurrence.ts`.
