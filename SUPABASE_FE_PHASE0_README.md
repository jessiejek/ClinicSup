# Supabase FE Phase 0 Patch

This patch only wires Supabase client-side auth/session foundation.

## Changed files

- package.json
- src/environments/environment.ts
- src/environments/environment.prod.ts
- src/app/core/services/supabase.service.ts
- src/app/core/services/auth.service.ts

## After applying

1. Run `npm install`.
2. Put the Supabase anon/publishable key in both environment files.
3. Test login using the existing super_admin account.
4. Do not test patient registration yet; patient self-registration needs its own RPC/form phase.
