# V1 Implementation Plan Index

Approved design: `2026-08-20-personal-productivity-app-v1-design.md`

The V1 is intentionally split into four sequential plans so each milestone is independently reviewable and testable:

1. **Foundation, Auth & Data**  
   Bootstrap Next.js, Supabase Auth, schema, RLS, Vietnamese app shell and base settings.

2. **Core Tasks & Views**  
   Task CRUD, projects/tags/subtasks, Task List/Table, Dashboard, Kanban, Eisenhower, Daily/Weekly planning and global search.

3. **Calendar, Recurring Tasks & Reminders**  
   FullCalendar, recurrence series/occurrences, reminder materialization, Supabase Cron and notification center.

4. **PWA, Hardening & Release**  
   Responsive/PWA, remaining settings, accessibility, error states, E2E/security/performance verification and deployment.

Recommended execution order is exactly 1 → 2 → 3 → 4.

Each plan uses TDD and frequent commits. Do not start the next plan until the previous plan's completion gate passes.