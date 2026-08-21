# Plan 02 Final Fix Report

## Findings Addressed

- Connected task create, edit, delete, status, tag, and checklist workflows to the shipped tasks route through `TasksWorkspace`, `QuickAddTask`, `TaskDetailSheet`, and `SubtaskList`.
- Connected project creation, archive, and delete controls to the shipped projects route.
- Added Today's Focus add, remove, and reorder controls to Daily Plan.
- Parsed task route search parameters on the server, passed functional filters into `listTasks`, loaded owned project/tag options, submitted filters with GET, opened `taskId` deep links, and honored Kanban `projectId` links.
- Changed tag filtering to an inner `task_tags` embed so it restricts top-level tasks.
- Removed Eisenhower and Focus derived fields from generic task validation. Create now derives automatic Eisenhower flags and DONE `completed_at`; updates preserve an existing DONE timestamp.
- Restricted Focus mutations to authenticated Focus actions backed by concurrency-safe RPCs and database constraints enforcing paired fields, positions 1-3, and one task per position.
- Added authenticated owned-tag validation and relation synchronization for task create/update.
- Made subtask reorder inspect every mutation result before reporting success.
- Replaced the mixed-language Eisenhower text with fully Vietnamese copy.
- Added route-level tests for tasks, Kanban, projects, and Daily Plan workflow reachability.

## RED Evidence

- Initial focused invariant/repository run: 15 failing tests across 6 files. Failures demonstrated client-controlled derived fields, missing create-time Eisenhower/DONE derivation, reset DONE timestamps, missing owned-tag synchronization, unchecked subtask reorder mutations, and bypassable/race-prone Focus writes.
- Client workflow run: tests failed because task/project/daily workspaces and production callers did not exist and shipped controls were inert.
- Route boundary run: 5 failures demonstrated missing tag option loading, ignored task/Kanban URL filters and deep links, and missing project/Daily Focus route controls.
- Each group was rerun after its implementation slice and passed before proceeding.

## Implementation Summary

- Added server route parameter parsing, server-fed filter options, functional GET filters, selectable task list/table rows, deep-linked details, and wired task mutations.
- Added client workspaces for tasks, projects, and Daily Plan while reusing existing actions and the single `tasks` data source.
- Hardened task action/repository boundaries for derived invariants, ownership-scoped tags, tag relation sync, and failed subtask writes.
- Added migration `202608210001_plan02_final_fixes.sql` with authenticated security-invoker Focus/tag RPCs, advisory locking for Focus writes, and database constraints/indexes for the max-three invariant.

## Verification

- Focused repair suite: 10 files passed, 43 tests passed.
- `corepack pnpm test:run`: 47 files passed, 167 tests passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm lint`: passed.
- `corepack pnpm build`: passed; all application routes compiled and page generation completed.
- `supabase/tests/schema_static_audit.ps1`: passed.
- `supabase/tests/rls_static_audit.ps1`: passed.
- `supabase/tests/profile_bootstrap_static_audit.ps1`: passed.
- `git diff --check`: passed.

## Deferred Database Verification

Live database migration, RPC, and cross-user RLS checks were not run because local Supabase/Docker execution is explicitly deferred for this fix wave. The new migration received static review and the required static audits only. Plan 02 must retain this DB/RLS item as DEFERRED until an approved live Supabase environment is available; this report does not claim live DB/RLS success.
