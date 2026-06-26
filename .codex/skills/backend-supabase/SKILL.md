---
name: backend-supabase
description: Build Supabase-backed web app features with Postgres tables, SQL schema files, Row Level Security policies, public client/server configuration, and React/Next.js data-access modules. Use when creating or modifying Supabase schemas, RLS policies, RPC functions, storage buckets, Next.js env setup, @supabase/supabase-js or @supabase/ssr clients, CRUD flows, server actions, authentication, or Vercel deployment configuration for Supabase-backed apps.
---

# Backend Supabase

Use this skill when the backend is Supabase rather than a custom Express API.

## Workflow

1. Define or update SQL schema under `supabase/`.
2. Enable Row Level Security on every public table.
3. Add explicit policies for the access model. Do not assume disabled RLS.
4. Put browser-safe env variables in `.env.example`, never real keys.
5. Keep the Supabase client in a small module such as `src/lib/supabase.js`.
6. Keep table/RPC calls in a data-access module, not scattered through UI components.
7. Use RPC functions for atomic operations such as vote increments.
8. Run `npm run build` after changing client code.

## Next.js Client Setup

Use public env variables for browser-safe clients:

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
```

Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for new projects. Accept `NEXT_PUBLIC_SUPABASE_ANON_KEY` when supporting older naming.

For authenticated Next.js App Router features, prefer `@supabase/ssr` server clients, server actions for writes, and page-level loaders for protected pages.

## SQL Standards

- Use `uuid` primary keys with `gen_random_uuid()`.
- Use `created_at timestamptz not null default now()`.
- Add check constraints for finite enums and positive numeric fields.
- Add unique indexes for seed data when using `on conflict do nothing`.
- Keep seed data in the same SQL file only for small MVP datasets.

## RLS Standards

- Enable RLS on public tables.
- For no-auth MVP apps, public `anon` policies may be acceptable, but call out that anyone with the public key can write.
- For private apps, prefer Supabase Auth and policies based on `auth.uid()`.
- Do not put service-role keys in frontend code or Vercel client envs.

## Data Access Standards

- Map database `snake_case` to UI `camelCase` in one module.
- Throw normalized errors from API helpers and let UI show concise feedback.
- Update UI after successful Supabase responses, not before.
- Keep delete/update operations scoped by primary key.
- Use `.select().single()` after inserts when the UI needs the created row.
