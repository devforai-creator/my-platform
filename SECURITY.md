# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Contact us via GitHub Security Advisories (preferred):
   - Go to the repository → Security tab → Report a vulnerability
3. Or email the maintainer directly (check GitHub profile)

We will respond within **48 hours** and provide a timeline for the fix.

## Security Architecture

### API Key Protection (BYOK Model)

This platform uses a **Bring Your Own Key (BYOK)** model where users register their own API keys (Google, OpenAI, Anthropic). Protecting these keys is our highest priority.

**Multi-Layer Protection**:
1. **Supabase Vault Encryption**: All API keys are encrypted at rest using Supabase Vault
2. **Service-Role Only Decryption** (v0.1.5+): Only server-side code with `SUPABASE_SERVICE_ROLE_KEY` can decrypt keys
3. **Row Level Security (RLS)**: Database policies ensure users can only access their own data
4. **Server-Only Node Runtime** (v0.1.8+): The chat API executes in the Node.js runtime so the service-role key never ships with edge bundles
5. **HTTPS Only**: All communications are encrypted in transit
6. **Vault Audit Trail** (v0.1.7+): Every BYOK secret create/delete (and denied attempt) is logged to `vault_secret_audit` for forensic review
7. **Secret Naming & Quotas** (v0.1.7+): `create_secret` enforces the `apikey_<user>_<provider>_<timestamp>` pattern and caps users at 10 active keys

**Reference**:
- Migration: `supabase/migrations/04_secure_get_decrypted_secret.sql`
- Admin Client: `src/lib/supabase/admin.ts`
- API Route: `src/app/api/chat/route.ts`

### Authentication

- **Provider**: Supabase Auth
- **Email Verification**: Enabled (as of v0.1.5)
- **Protected Routes**: All `/dashboard/*` routes require authentication
- **JWT Tokens**: Automatically managed by Supabase SSR

### Database Security

- **Row Level Security (RLS)**: Enabled on all tables (`profiles`, `api_keys`, `characters`, `chats`, `messages`)
- **User Isolation**: Queries automatically filter by `auth.uid()` to prevent cross-user access
- **Vault RPC Functions**: All RPC functions verify ownership before decryption/deletion

#### Starter Characters (v0.1.6+)

**Architecture**: Global shared characters with `user_id = NULL`

**Security Model**:
- **Service Role Only Creation**: Only server-side scripts with service role can create `user_id=NULL` characters
- **Explicit NULL Blocking**: RLS policies explicitly check `user_id IS NOT NULL` to prevent privilege escalation
- **Read-Only for Users**: Authenticated users can view starters but cannot modify or delete them
- **Triple Validation**: INSERT/UPDATE/DELETE policies all verify `user_id IS NOT NULL`

**Reference**:
- Migration: `supabase/migrations/05_allow_starter_characters.sql`
- Seed Script: `seed-starter-character.ts` (admin only)

### Abuse Mitigation & Telemetry (v0.1.7+)

- `/api/chat` rate limiting:
  - Authenticated traffic runs through the `check_chat_rate_limit` RPC (service role only) backed by the `chat_rate_limits` ledger table.
  - Anonymous traffic (v0.1.8+) is throttled by the persistent `check_anon_rate_limit` RPC using the `anon_rate_limits` table so limits survive edge cold starts and horizontal scaling.
- Token usage telemetry persists into `chat_usage_events`, enabling future anomaly detection and billing dashboards.
- Vault helper functions append audit rows to `vault_secret_audit` for every create/delete operation and for denied attempts, providing traceability for BYOK actions.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.8   | :white_check_mark: |
| 0.1.7   | :x: (Service-role key exposure on Edge runtime) |
| 0.1.6   | :white_check_mark: |
| 0.1.4   | :x: (Critical vulnerability) |
| < 0.1.4 | :x:                |

**Please upgrade to v0.1.8 for the latest features and security improvements.**

## Security Incidents

### Critical: Service-Role Key Exposure on Edge Runtime (2025-10-31)

**Status**: ✅ Resolved in v0.1.8

#### Vulnerability Details

**CVE**: Pending internal advisory  
**Severity**: Critical  
**Discovered By**: Codex (security review)  
**Affected Versions**: v0.1.7 (Phase 0 chat launch) through 0.1.7‑patch.1  
**Date Discovered**: 2025-10-31  
**Date Patched**: 2025-10-31

#### Description

The `/api/chat` route forced the Vercel Edge runtime while importing `createAdminClient`, which instantiates Supabase with `SUPABASE_SERVICE_ROLE_KEY`. Edge workers bundle environment values into static assets under `/_next/static`, allowing anyone to download the worker script and recover the service-role key. Possession of that key bypasses every RLS policy, yielding full database read/write.

**Attack Scenario**

1. Attacker hits the deployed `/api/chat` URL (or references `/_next/static/chunks/_edge*.js`) and downloads the compiled edge worker.
2. The service-role key appears in cleartext within the bundle.
3. Attacker uses the key with the Supabase REST or PostgREST endpoints to read/modify any table, including `api_keys`, `messages`, and `profiles`.

**Root Cause**

- Edge runtime inlined server secrets into client-reachable bundles.
- Lack of runtime segregation for admin-only Supabase client logic.

#### Timeline

- **2025-10-31 09:20 KST** – Codex observes service-role key embedded in edge bundle during review.
- **2025-10-31 09:45 KST** – Vulnerability confirmed; mitigation plan drafted.
- **2025-10-31 10:15 KST** – Chat route switched to Node runtime; anonymous rate limiter moved to Supabase RPC to keep behaviour parity.
- **2025-10-31 10:40 KST** – New migration `07_persistent_anon_rate_limit.sql` deployed; service-role key rotated.
- **2025-10-31 11:00 KST** – Patch deployed to production and documentation updated.

#### Patch

- `src/app/api/chat/route.ts`: `runtime` set to `'nodejs'`; anonymous requests now call `check_anon_rate_limit`.
- `supabase/migrations/07_persistent_anon_rate_limit.sql`: Introduced persistent rate-limit table/function for anonymous buckets.
- `src/types/database.types.ts`: Added typed definition for the new RPC.

#### Impact

- **User Count**: All tenants on v0.1.7 (Phase 0 pilot).  
- **Data Compromised**: No evidence of exploitation; logs showed no external fetches of edge bundle prior to patch.  
- **Action Required**: Rotate `SUPABASE_SERVICE_ROLE_KEY`; redeploy environments; instruct users to re-issue personal API keys if compromise is suspected.

#### Response Actions

1. ✅ Forced Node runtime for `/api/chat`.  
2. ✅ Deployed migration 07 and rotated the service-role key.  
3. ✅ Added regression test cases for anonymous rate-limiter behaviour.  
4. ✅ Updated `SECURITY.md` and release checklist to verify runtime placement for admin clients.  
5. ✅ Planned follow-up: automated CI guard to scan edge bundles for secret-like tokens.

#### Lessons Learned

1. **Edge bundles leak env vars**: Treat edge/runtime choice as a secret boundary.  
2. **Secrets need scanning**: Add automated checks that fail builds if service-role patterns appear in static artifacts.  
3. **Persistence for abuse controls**: Moving throttles to the database avoids reintroducing memory-only shortcuts when switching runtimes.  
4. **Release checklist gap**: Runtime selection must be part of security review before shipping.

#### Recommendations for Self-Hosters

- Apply migration `07_persistent_anon_rate_limit.sql`.  
- Rotate `SUPABASE_SERVICE_ROLE_KEY` and update hosting environment variables.  
- Ensure any admin Supabase client runs exclusively in Node/serverless environments, never Edge.

### Critical: Client-Side Vault Access (2025-10-30)

**Status**: ✅ Resolved in v0.1.5

#### Vulnerability Details

**CVE**: N/A (Privately disclosed and patched)
**Severity**: Critical
**Discovered By**: Codex (internal security review)
**Affected Versions**: v0.1.0 - v0.1.4
**Date Discovered**: 2025-10-30
**Date Patched**: 2025-10-30

#### Description

The `get_decrypted_secret` RPC function was accessible to authenticated users in browsers, allowing XSS attacks or malicious browser extensions to directly call the function and exfiltrate API keys.

**Attack Scenario**:
1. Attacker injects XSS payload or installs malicious browser extension
2. Script calls `supabase.rpc('get_decrypted_secret', { secret_name: 'api_key_...' })`
3. Vault returns decrypted API key to browser
4. Attacker exfiltrates key to external server

**Root Cause**:
- RPC function granted to `authenticated` role instead of `service_role` only
- No server-side enforcement of decryption access

#### Timeline

- **2025-10-30 10:00 KST**: Codex discovers vulnerability during code review
- **2025-10-30 10:30 KST**: Vulnerability confirmed, patch development begins
- **2025-10-30 11:00 KST**: Migration 04 created, admin client pattern implemented
- **2025-10-30 11:30 KST**: Patch deployed to production
- **2025-10-30 12:00 KST**: Security response executed:
  - All existing API keys deleted (~5 users affected)
  - Security notice banner deployed
  - Email verification enabled for new signups

#### Patch

**Migration**: `supabase/migrations/04_secure_get_decrypted_secret.sql`

Key Changes:
```sql
-- Revoke access from authenticated/anon roles
revoke all on function public.get_decrypted_secret(text, uuid) from public, anon, authenticated;

-- Grant only to service_role
grant execute on function public.get_decrypted_secret(text, uuid) to service_role;
```

**Code Changes**:
- Created `src/lib/supabase/admin.ts` for service-role client
- Updated `/api/chat/route.ts` to use admin client for Vault access
- Added explicit `requester` parameter for ownership validation

#### Impact

- **User Count**: ~5 users (Phase 0 MVP)
- **Data Compromised**: None (no evidence of exploitation)
- **Action Required**: Users must re-register API keys

#### Response Actions

1. ✅ Deployed patch (migration 04)
2. ✅ Deleted all existing API keys from database
3. ✅ Added security notice banner (`SecurityNoticeBanner.tsx`)
4. ✅ Enabled email verification for new signups
5. ✅ Updated documentation (README.md, CHANGELOG.md, CLAUDE.md)

#### Lessons Learned

1. **PostgreSQL RLS ≠ RPC Security**: RLS policies on tables don't automatically apply to RPC functions
2. **`SECURITY DEFINER` Risks**: Functions with `SECURITY DEFINER` bypass RLS and need explicit role restrictions
3. **Defense in Depth**: Always assume browser can be compromised (XSS, extensions)
4. **Testing**: Need automated tests for RPC function permissions

#### Recommendations for Self-Hosters

If you are self-hosting v0.1.4 or earlier:

1. **Upgrade immediately** to v0.1.5
2. Run migration `04_secure_get_decrypted_secret.sql` in Supabase SQL Editor
3. Set `SUPABASE_SERVICE_ROLE_KEY` environment variable
4. Delete existing API keys: `DELETE FROM api_keys;`
5. Notify users to re-register API keys

#### Verification

Check if patch is applied:

```sql
-- Verify RPC function signature
SELECT p.proname, pg_get_function_arguments(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'get_decrypted_secret';

-- Should show: get_decrypted_secret(secret_name text, requester uuid)

-- Verify permissions (should only show service_role)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_decrypted_secret';
```

#### Attack Simulation (Penetration Test)

To verify the patch blocks real attack scenarios, follow this penetration test:

**Test 1: Client-Side Data Exposure Check**

Browser console:
```javascript
// Check if vault_secret_name is exposed to client
document.body.innerText.includes('api_key_')
// Expected: false ✅
```

**Result**: `vault_secret_name` is NOT included in SELECT queries (see `src/app/dashboard/api-keys/page.tsx:21`), preventing attackers from knowing secret names.

---

**Test 2: Direct RPC Call Attempt (SQL Editor)**

Supabase SQL Editor:
```sql
-- 1. Get your vault_secret_name (requires authenticated session)
SELECT id, provider, vault_secret_name
FROM api_keys
WHERE user_id = auth.uid();

-- 2. Try to decrypt (should be blocked)
SELECT get_decrypted_secret('api_key_xxx_google_xxx');
```

**Expected Result**:
```
ERROR: 42501: Not authorized
CONTEXT: PL/pgSQL function get_decrypted_secret(text,uuid) line 9 at RAISE
```

✅ **Verified on 2025-10-30**: Patch successfully blocks unauthorized decryption.

---

**Test 3: Browser Console Attack (Theoretical)**

Even if an attacker loads Supabase client in browser:

```javascript
// Attacker loads Supabase SDK via CDN
import('https://cdn.skypack.dev/@supabase/supabase-js').then(async ({ createClient }) => {
  const client = createClient('SUPABASE_URL', 'ANON_KEY')

  // Attempt to call RPC with guessed secret_name
  const { data, error } = await client.rpc('get_decrypted_secret', {
    secret_name: 'api_key_guess'
  })

  console.log(error ? '✅ BLOCKED: ' + error.message : '⚠️ LEAKED')
})
```

**Expected Result**: `permission denied for function get_decrypted_secret`

**Why Attack Fails**:
1. RPC function revoked from `authenticated` role
2. `vault_secret_name` not exposed in client queries
3. Ownership validation in function logic
4. Service-role only decryption

---

**Defense Layers**:
- 🛡️ Layer 1: `vault_secret_name` not sent to client (data minimization)
- 🛡️ Layer 2: RPC permission denied for `authenticated` role
- 🛡️ Layer 3: Explicit ownership validation in function (`requester` parameter)
- 🛡️ Layer 4: Server-side admin client for legitimate decryption only

---

## Security Best Practices for Contributors

If you are contributing code to this project:

### Server Actions
- [ ] Always call `auth.getUser()` to verify authentication
- [ ] Filter queries by `user_id` to enforce ownership
- [ ] Never trust client-provided IDs without server-side validation

### RPC Functions
- [ ] Use `auth.uid()` to get current user
- [ ] Verify ownership before returning sensitive data
- [ ] Grant to `service_role` only for Vault operations

### API Routes
- [ ] Validate all input parameters
- [ ] Check resource ownership (e.g., chat belongs to user)
- [ ] Use admin client for Vault access only

### References
- See `CLAUDE.md` → "Security Patterns for AI" section
- See `src/app/api/chat/route.ts` for secure API route example
- See `supabase/migrations/04_secure_get_decrypted_secret.sql` for RPC security

---

## Transparency Commitment

We believe in transparent security practices:

- ✅ All security incidents are documented in this file
- ✅ Patches are open-source and auditable
- ✅ Users are notified of breaking security changes
- ✅ No security through obscurity

**This project is open-source. You can audit all code at [github.com/devforai-creator/my-platform](https://github.com/devforai-creator/my-platform).**

---

**Last Updated**: 2025-10-31 (v0.1.8)
