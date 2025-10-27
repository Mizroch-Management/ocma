# Program QA Environment Setup

This document tracks the dedicated QA environment used for the OCMA overhaul program.

## Provisioning Summary
- **Vercel project**: `ocma-qa`
- **Supabase project**: `ocma-qa-shadow`
- **Git branch auto-deploy**: `program/ocma-overhaul`
- **Domains**: `qa.ocma.example.com` (placeholder until DNS configured)

## Required Secrets
| Service | Key | Source | Notes |
| --- | --- | --- | --- |
| Supabase | `SUPABASE_URL` | Supabase dashboard | QA project URL |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard | Store only in server-side env |
| Supabase | `SUPABASE_ANON_KEY` | Supabase dashboard | Client runtime |
| OpenAI | `OPENAI_API_KEY` | Secret manager | Optional until Phase 2 tests |
| Resend | `RESEND_API_KEY` | Secret manager | Team invitations |

Create these secrets in Vercel (`vercel env add`) and Supabase (`supabase secrets set`).

## Deployment Pipeline
1. Push to `program/ocma-overhaul`.
2. GitHub Actions runs lint, typecheck, unit tests.
3. On success, deploy preview to Vercel QA project.
4. Supabase migrations run via `supabase db push --project-ref ocma-qa-shadow`.
5. Publish seeded data using `scripts/seed-qa.ts` (to be implemented).

## Smoke Checklist
- ✅ Health check route `/api/status` returns 200.
- ☐ Auth sign-in/out (email + password).
- ☐ Organization create + switch.
- ☐ Scheduler job creation (mock backend).
- ☐ Edge function access requires valid JWT.

Status boxes will be updated as features land.

## Observability
- Sentry DSN (QA): `https://examplePublicKey@o0.ingest.sentry.io/0`
- Supabase Log drains → log retention: 7 days.
- Slack alerts channel: `#ocma-qa-alerts`.

## Next Actions
- [ ] Wire GitHub Actions workflow for branch deployments.
- [ ] Create Supabase shadow project and export credentials.
- [ ] Add environment smoke tests to CI.

