# Test & Deployment Credential Checklist

Fill in the `Value` column with real secrets (or a reference to where they live, e.g., “1Password › OCMA QA vault”). Share the completed copy through a secure channel—do **not** commit populated secrets.

## How to Use This Template
1. Copy this file to a secure location (e.g., `environments/qa/test-credentials.md`) and populate the Value column.
2. Mirror the same values in the appropriate secret stores:
   - Local development: `.env.local`, `.env.server`, Supabase CLI config.
   - GitHub Actions: repository secrets (names listed below).
   - Vercel / Supabase dashboard: environment variables & secrets panels.
3. Once populated, send me the secure copy or vault reference so I can hydrate the environment and run the full test matrix.

---

## Core Platform Variables
| Key | Purpose / Used By | Source / Notes | Value |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Frontend & API routes need project URL | Supabase dashboard › Project settings |  |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client-side anon key | Supabase dashboard › API › anon key |  |
| `SUPABASE_URL` | Server-side Supabase client (`lib/supabaseAdmin.ts`) | Same as `VITE_SUPABASE_URL` |  |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge functions & scripts (service role) | Supabase dashboard › API › service role |  |
| `SUPABASE_SERVICE_ROLE` | Legacy alias used by `lib/supabaseAdmin.ts` (set to same value as above) | Duplicate of service role key |  |
| `NEXT_PUBLIC_SUPABASE_URL` | Older API routes (`api/*`) still reference this | Match `VITE_SUPABASE_URL` |  |
| `APP_VERSION` | Optional build metadata (CI) | Set during CI or leave blank |  |

## Queue & Background Jobs
| Key | Purpose | Source / Notes | Value |
| --- | --- | --- | --- |
| `UPSTASH_QSTASH_TOKEN` | Queue scheduling in `api/jobs/schedule.ts` | Upstash QStash project token |  |
| `UPSTASH_QSTASH_URL` | QStash API base | Upstash dashboard |  |

## Social Platform Credentials
| Key | Platform / Usage | Notes | Value |
| --- | --- | --- | --- |
| `TWITTER_CLIENT_ID` | X OAuth 2.0 login/posting | Required for `api/connect/twitter.ts` |  |
| `TWITTER_CLIENT_SECRET` | X OAuth 2.0 secret | Keep in server-side contexts only |  |
| `TWITTER_API_KEY` | X API v1 fallback (OAuth 1.0a) | Optional but recommended |  |
| `TWITTER_BEARER_TOKEN` | X App-only posting/testing | Needed for `test-all-configs.js` |  |
| `X_BEARER_TOKEN` | Health check fallback | Can reuse bearer token |  |
| `FACEBOOK_APP_ID` | Meta app configuration | Shared between FB/IG |  |
| `FACEBOOK_APP_SECRET` | Meta app secret | Server-side only |  |
| `FB_PAGE_ID` | Facebook Page to post against | Health + publishing |  |
| `FB_PAGE_TOKEN` | Page access token | Requires Page scope approval |  |
| `INSTAGRAM_CLIENT_ID` | Instagram Basic/Graph | For auth flows |  |
| `INSTAGRAM_CLIENT_SECRET` | Instagram secret | Server-side only |  |
| `IG_TOKEN` | Instagram long-lived token | Needed for analytics |  |
| `IG_USER_ID` | Instagram business/creator ID | Graph API |  |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth | Posting & analytics |  |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth secret | Server-side only |  |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn API token | Used in health checks |  |
| `LINKEDIN_AUTHOR_URN` | Optional person URN | e.g., `urn:li:person:...` |  |
| `LINKEDIN_ORG_URN` | Optional organization URN | e.g., `urn:li:organization:...` |  |
| `LINKEDIN_VERSION` | LinkedIn API version override | Optional |  |
| `TELEGRAM_BOT_TOKEN` | Telegram notifications | Optional |  |
| *(TikTok / Pinterest / Snapchat)* | App keys, client secrets, redirect URIs | Needed once publish helpers are implemented |  |

## AI Providers
| Key | Provider | Notes | Value |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI (server-side) | Needed for `/api/ai/*` routes |  |
| `VITE_OPENAI_API_KEY` | OpenAI (client fallbacks) | Optional; prefer server key |  |
| `VITE_OPENAI_ORG_ID` | OpenAI organization | Optional |  |
| `ANTHROPIC_API_KEY` | Anthropic Claude | Edge functions + `/api/config` |  |
| `VITE_ANTHROPIC_API_KEY` | Client access if required | Optional |  |
| `VITE_STABILITY_API_KEY` | Stability AI image gen | Used by visual generator |  |
| `POSTHOG_API_KEY` / `VITE_POSTHOG_API_KEY` | PostHog analytics | Same value for client/server |  |
| `VITE_POSTHOG_HOST` | PostHog host (default `https://app.posthog.com`) | Override if self-hosted |  |

## Observability & Ops
| Key | Purpose | Notes | Value |
| --- | --- | --- | --- |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Sentry DSN for app | Populate both server/client variants |  |
| `SENTRY_AUTH_TOKEN` | Required for source map upload in CI | Sentry account |  |
| `DISCORD_WEBHOOK_URL` | Connector health + test alerts | Used by `/api/connect/test-post.ts` |  |

## QA / Test Execution
| Key | Purpose | Notes | Value |
| --- | --- | --- | --- |
| `TEST_USER_EMAIL` | Playwright login account | Seed a user in Supabase auth |  |
| `TEST_USER_PASSWORD` | Playwright login password | Store in secret manager |  |
| `PLAYWRIGHT_TEST_BASE_URL` | QA deployment URL | e.g., `https://qa.ocma.example.com` |  |
| `BASE_URL` | Local Playwright base (optional) | Defaults to `http://localhost:5173` |  |
| `VERCEL_PROTECTED` | Flag for password-protected previews | Set to `true` if Vercel auth on |  |
| `SOCIAL_TEST_MODE` | Connector health route mode | `env` (default) or `db` |  |
| `NODE_ENV`, `CI` | Managed by tooling | No manual input required |  |

## CI/CD Secrets (GitHub Actions & Vercel)
| Secret Name | Used By | Notes | Value / Vault Ref |
| --- | --- | --- | --- |
| `VERCEL_TOKEN` | GitHub Actions deploy step | Personal/team token with deploy scope |  |
| `VERCEL_ORG_ID` | GitHub Actions | Vercel org/team ID |  |
| `VERCEL_QA_PROJECT_ID` | GitHub Actions | QA project ID |  |
| `VERCEL_TEAM` | GitHub Actions | Team slug if required |  |
| `QA_SUPABASE_DB_URL` | GitHub Actions migrations | `postgresql://` connection string |  |
| `QA_SUPABASE_ACCESS_TOKEN` | GitHub Actions CLI auth | Supabase access token with project access |  |
| `QA_SUPABASE_REF` | GitHub Actions `db push` | Supabase project ref (e.g., `wxxjbkqn...`) |  |
| `SENTRY_AUTH_TOKEN` | GitHub Actions (source maps) | Duplicate of above if uploading |  |

---

## Running the Test Suites (once filled)
1. **Local services**: `./start-supabase-local.sh` (requires Supabase CLI + Docker running).
2. **Populate env files**:
   - `.env.local` → VITE_* keys, PostHog, Sentry.
   - `.env.server` (or export) → Supabase service role, social API credentials, AI keys.
3. **Install deps**: `npm ci`
4. **Unit tests**: `npm run test` (add `--coverage` once coverage tooling configured).
5. **Lint & types**: `npm run lint && npm run typecheck`
6. **E2E tests**: `npx playwright test --config tests/e2e/playwright.qa.config.ts` (requires QA URL + seeded account).
7. **Edge function smoke**: `supabase functions serve` with same env to validate Deno functions if needed.

Let me know once the Value column is filled in or if any providers require additional setup steps.
