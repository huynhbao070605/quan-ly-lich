# Deferred Database Verification

## Status

Plan 01 implementation is complete, but the live local Supabase database verification is deferred.

This is not a passed verification. It is a technical debt item that must be resolved before any release gate that requires live migration, RLS, trigger, or database integration proof.

## Reason

Local Supabase depends on Docker Desktop or Podman. Running local Supabase/Docker on this Windows machine caused operating-system instability, so the project owner explicitly decided not to continue Docker/Windows debugging at this time.

## Do Not Run

Until this item is intentionally resumed:

- Do not run `npx supabase start`.
- Do not run `npx supabase db reset`.
- Do not start Docker or Podman from the agent.
- Do not edit migrations to avoid verification.
- Do not claim database integration tests passed.

## Verified Without Docker

The following Plan 01 checks passed without Docker:

- `corepack pnpm test:run`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm build`
- `supabase/tests/schema_static_audit.ps1`
- `supabase/tests/rls_static_audit.ps1`
- `supabase/tests/profile_bootstrap_static_audit.ps1`

## Deferred Items

- Apply all Supabase migrations from zero with `npx supabase db reset`.
- Execute SQL smoke tests in `supabase/tests/*.sql`.
- Verify RLS behavior against a real local Supabase database.
- Verify `auth.users` profile/settings bootstrap trigger creates exactly one `profiles` and one `user_settings` row.
- Generate Supabase database types from a live local database when the local Supabase runtime is available.

## Plan 02 Policy

For Plan 02:

- Write database/integration tests when required by the plan.
- Run unit and component tests that do not require Docker.
- Use mocks or fakes only where appropriate for unit-level behavior.
- Mark database-backed integration verification as deferred when it cannot run.
- Do not pretend deferred database tests passed.

## Plan 02 Deferred Items

Plan 02 implementation is complete through Core Tasks & Views, but the live local Supabase database verification remains deferred.

This is not a passed verification. The following Plan 02 areas still need live database/RLS proof when Supabase runtime is intentionally resumed:

- Task CRUD repository actions, including authenticated ownership scoping.
- Project/tag relations, including project delete `ON DELETE SET NULL` and tag relation cleanup.
- Subtask ownership through parent task and database FK behavior.
- Search/filter query execution against real Supabase data and RLS.
- Dashboard, Daily Plan, Weekly Plan, Kanban, Eisenhower, and Global Search page reads through RLS.
- Kanban reorder/move RPC transaction behavior and rollback semantics.
- Eisenhower override/reset writes through RLS.
- Today's Focus count/update/reorder behavior, including max-3 enforcement under real database constraints and concurrent calls.
- Global Search task/project/tag-derived matches against real relational data.
