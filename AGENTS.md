# AGENTS.md

## Project Rules

- Build the V1 personal productivity web app from the approved Markdown spec and plans only.
- Treat `docs/superpowers/specs/2026-08-20-personal-productivity-app-v1-design.md` as the product source of truth.
- Treat `docs/superpowers/plans/2026-08-20-01-foundation-auth-data.md` through Plan 04 as the implementation order source of truth.
- Execute plans sequentially. Do not start a later plan until the current plan completion gate passes.
- Keep all user-facing UI text in Vietnamese.
- Use English for code identifiers, database identifiers, type names, and function names.
- Use Next.js App Router, TypeScript, pnpm, Tailwind CSS, shadcn/ui, Supabase Auth/PostgreSQL/RLS, Zod, Vitest, Testing Library, Playwright, PWA, and Vercel.
- Do not add V1 out-of-scope features: team workspace, task assignment, attachments, AI, billing, email/push notifications, custom statuses, realtime collaboration, microservices, Redis, Kafka, MongoDB, or Kubernetes.

## Security Rules

- Supabase Row Level Security is mandatory for all user-owned tables.
- Never trust `user_id` from the client. Server-side code must derive ownership from the authenticated user.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser/client code.
- Use Zod validation at server boundaries.
- Test cross-user access and RLS behavior.

## Product Rules

- Timezone is fixed for V1: `Asia/Ho_Chi_Minh (UTC+7)`.
- A task is stored once and rendered through multiple views.
- Calendar, Kanban, Eisenhower, Dashboard, Daily Plan, and Weekly Plan must use the same task data.
- Eisenhower manual override must not be overwritten by later priority/deadline changes.
- Today's Focus is limited to 3 tasks per day.
- Recurring task history must be preserved with series and occurrence identity.
- V1 notifications are in-app only and scheduler-driven server-side.

## Workflow Rules

- Follow TDD for business logic and security-sensitive behavior: failing test, implementation, passing test, refactor.
- Commit frequently by task or milestone.
- Do not commit `.env`, secrets, production credentials, or generated local service data.
- Run each plan completion gate before claiming that plan is complete.
