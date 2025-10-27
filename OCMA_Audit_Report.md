**Audit Findings**
Executive summary: Critical security gaps let anyone hit your paid backend endpoints, and core scheduling and team workflows fail because the React app depends on server-only code or wrong database columns. Without better logging hygiene and type safety, these faults stay hidden until customers hit them.
- **Critical – Unprotected backend endpoints**: `supabase/functions/generate-content/index.ts:11-119` and `supabase/functions/fetch-analytics/index.ts:33-96` read the Supabase service key and run without checking the caller’s session, so anyone can trigger AI usage or pull analytics just by calling the URL. This exposes paid APIs to abuse and ignores organization-level access control.
- **Critical – Social posting API both unsafe and broken**: `supabase/functions/social-post/index.ts:30-109` trusts the caller-provided `organizationId` while using the service key to post on behalf of every stored account; at the same time it filters on `organization_id`, but `platform_accounts` (schema in `supabase/migrations/20250817_real_backend_implementation.sql:1-19`) has no such column. Result: attackers could spoof posts, and legitimate users cannot publish at all.
- **High – Scheduler cannot run in the browser**: `src/lib/queue/job-queue.ts:4-74` imports the Redis client `ioredis`, yet the component `src/components/ai/intelligent-scheduler.tsx:245-299` calls it directly from React. Browsers cannot load Redis, so scheduling throws and the UI silently falls back to alerts.
- **High – Intelligent scheduler never finds an organization**: The same component queries `organizations` by `owner_id` (`src/components/ai/intelligent-scheduler.tsx:246-250`), but the table only has `id`, `name`, `slug`, and status fields (`src/integrations/supabase/types.ts:145-156`). Users always see “No organization found,” blocking the workflow.
- **Medium – Team invitations crash on error paths**: `src/hooks/use-team-management.tsx:124-134` logs a `memberEmail` variable that does not exist, so any email failure throws a new exception and hides the real issue. Invites, cancellations, or debugging attempts silently fail.
- **Medium – Multi-organization access locked to the first membership**: `supabase/migrations/20250803120736_b51b6f2c-abc5-497a-9049-4cd78268813c.sql:72-88` defines `get_user_organization` to return only the first active membership. Because most RLS policies depend on it, users in multiple companies are pinned to whichever record returns first and cannot reach the others.
- **Medium – Production logs leak user details**: `src/hooks/use-auth.tsx:45-80` and `src/hooks/use-organization.tsx:91-158` print emails, role decisions, and database payloads. In production this exposes personal data and Supabase responses to anyone reading logs.
- **Medium – Build settings hide bugs and hit production by default**: `tsconfig.json:12-17` disables strict TypeScript checks, letting schema mismatches through. `src/integrations/supabase/client.ts:5-20` falls back to the live Supabase URL and anon key, so local testing accidentally reads and writes production data unless env vars are set.

**Implementation Plan**
Executive summary: Fix security first, then restore publishing and scheduling, stabilise organization access, and finally raise quality gates so regressions surface earlier.
- Lock down every edge function and secret.
- Rebuild publishing and scheduling on proper server infrastructure.
- Repair organization and team data handling so people can actually work.
- Add guardrails (tests, linting, logging) before resuming feature work.

Detailed project management plan:
| Phase | Target timing | Lead team | Key actions | Deliverables |
| --- | --- | --- | --- | --- |
| 1. Security hardening | Week 1 | Backend + Security | Add Supabase auth verification and role checks to every edge function; move the service key out of client code; rotate exposed keys; scrub PII logging | Locked-down endpoints, rotated credentials, redacted logs |
| 2. Restore automation | Weeks 2-3 | Backend + Integrations | Move job queue and social posting to a server runtime (Supabase cron/Edge background or Vercel server); fix the `platform_accounts` query; add rate limits and alerts | Working post publication and analytics fetch with monitoring |
| 3. Organization & team stability | Weeks 3-4 | Backend + Frontend | Rewrite `get_user_organization` to support multiple memberships; update scheduler and team hooks to use new APIs; add organization switcher tests | Members can switch orgs, schedule posts, and invite teammates without errors |
| 4. Quality & release readiness | Weeks 4-5 | Frontend + DevEx | Re-enable strict TypeScript, add Vitest coverage for key hooks, add Playwright smoke tests, document new ops runbooks | Passing test suite, stricter builds, deployment checklist |

Immediate next steps: confirm which edge functions must stay live during fixes, agree on the hosting pattern for the job queue, and schedule key rotations so customer traffic is not interrupted.
