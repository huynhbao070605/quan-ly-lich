# Deployment procedure

## Supabase production setup

1. Create a Supabase project for production.
2. Copy the production project ref from the Supabase dashboard.
3. Link the local CLI when intentionally working against production:

```bash
npx supabase link --project-ref <project-ref>
```

`<project-ref>` is a runtime value from the Supabase project and must never be committed.

4. Push migrations:

```bash
npx supabase db push
```

5. Configure Google OAuth in Supabase Auth providers.
6. Add the production callback URL:

```text
https://<domain>/auth/callback
```

`<domain>` is the deployed Vercel or custom domain.

7. Verify RLS policies and cron jobs in the production Supabase project.

## Vercel environment variables

Configure these variables in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
```

Only `NEXT_PUBLIC_*` variables are browser-visible. `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.

## Production verification

Run non-Docker checks locally before deploy:

```bash
corepack pnpm test:run
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm security:check
corepack pnpm build
```

Run live checks only in an intentionally enabled Supabase environment:

```sql
select * from cron.job;
```

Also verify:

- RLS smoke tests for cross-user access.
- Google OAuth redirect to `https://<domain>/auth/callback`.
- PWA manifest and service worker in a production browser session.
