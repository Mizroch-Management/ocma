# OCMA Revamp Implementation Blueprint

## 1. Strategic Overview
- **Goal**: Ship a secure, reliable OCMA platform with working automation while hardening operations for future growth.
- **Scope**: Supabase edge functions, web app workflows, scheduling/publishing backend, team/org management, developer tooling, and release processes.
- **Success Criteria**: All critical findings closed, automated tests green, zero open P0/P1 bugs, security review sign-off, and documented runbooks.

## 2. Team of Record
| Pod | Lead | Core Members | Focus |
| --- | --- | --- | --- |
| **Security & Infrastructure** | Priya Raman (Security Architect) | Alex Meyer (Supabase SME), Dan Chen (DevOps) | Lock down edge functions, key rotation, Secrets management, observability |
| **Backend & Integrations** | Mateo Silva (Principal Engineer) | Keisha Brown (API Engineer), Luca Bern (OAuth Specialist) | Job queue migration, social publishing, analytics fetch, Redis replacement |
| **Web Experience** | Mei Takahashi (Frontend Lead) | Jordan Patel (React Engineer), Saanvi Rao (UX QA) | Scheduler, organizations/team flows, logging cleanup, UI polish |
| **Quality & Automation** | Tatiana Kos (QA Lead) | Omar Malik (Playwright), Ingrid Sørensen (Vitest) | Environment setup, regression suites, coverage targets |
| **Program Management** | Elena García (Delivery) | — | Backlog, status reporting, stakeholder comms |

## 3. Workstream Breakdown
### Phase 1 — Security Hardening (Week 1)
- **Deliverables**: Authenticated edge functions, rotated Supabase keys, logging redaction, incident response runbook.
- **Key Tasks**:
  1. Implement Supabase JWT verification middleware for all Deno functions.
  2. Move service role key to server-side secrets (Vercel + Supabase). Purge from repo history.
  3. Rotate keys, update env tooling, confirm no client defaults.
  4. Replace console logs containing PII with structured, sanitized logs.
  5. Add Sentry + Supabase audit log alerts.

### Phase 2 — Automation Restoration (Weeks 2–3)
- **Deliverables**: Server-executed job queue, working social-post pipeline, analytics fetch with throttling, monitoring dashboards.
- **Key Tasks**:
  1. Replace `ioredis` browser queue with Supabase Scheduled Function or Vercel cron job.
  2. Introduce queue worker service (Edge Function or serverless) with retry + backoff.
  3. Normalize `platform_accounts` schema and queries; enforce organization scoping.
  4. Harden social posting endpoints with per-org authorization + rate limits.
  5. Add analytics fetch caching + usage telemetry.

### Phase 3 — Organization & Collaboration (Weeks 3–4)
- **Deliverables**: Multi-org support, reliable team invitations, functional scheduling UI.
- **Key Tasks**:
  1. Refactor `get_user_organization` to return all memberships; update RLS policies.
  2. Build org-switching API + UI flow, persist choice in context.
  3. Update scheduler to fetch org via new endpoint instead of `owner_id`.
  4. Fix invitation hook logging, add transactional email fallbacks.
  5. Add acceptance tests covering org creation, switching, invitations, scheduling.

### Phase 4 — Quality & Release Readiness (Weeks 4–5)
- **Deliverables**: Strict TypeScript, test coverage, deployment checklist, rollback plan.
- **Key Tasks**:
  1. Re-enable `strict` TS options and fix type violations.
  2. Expand Vitest unit coverage for hooks and utilities.
  3. Add Playwright smoke flows (auth, org onboarding, posting).
  4. Implement linting/pre-commit hooks and CI gates.
  5. Publish runbooks (deployment, incident, onboarding) and final QA sign-off.

## 4. Branching & Delivery Strategy
- **Primary branch**: `main` (frozen for hotfix-only during program).
- **Program branch**: `program/ocma-overhaul` hosting all epic work.
- **Work branches**: `feature/<workstream>/<task>` per Jira ticket, PR into program branch.
- **Release candidate tags**: `rc-YYYYMMDD-n` once QA approves.
- **Protection**: Mandatory PR reviews (Security & QA for relevant changes), automated tests required.

## 5. Environment Architecture
| Environment | Purpose | Hosting | Notes |
| --- | --- | --- | --- |
| **Development** | Engineer sandbox | Local + supabase local | Mock services, feature flags, seeded data |
| **Program QA** | Central integration testing | Vercel project `ocma-qa` + Supabase shadow project | Auto-deploy per PR, seeded with fixtures |
| **Staging** | Pre-release validation | Vercel `ocma-staging` | Mirrors production configs, manual promotion |
| **Production** | Launch-ready | Vercel `ocma-prod` | gated by release checklist |

- **Observability Stack**: Sentry (frontend + functions), Supabase logs, Vercel analytics, PagerDuty integration.
- **Secrets Management**: Vercel env groups per environment, Supabase secrets API, 1Password vault for manual access.

## 6. Tooling & Automation
- CI pipeline (GitHub Actions): lint → typecheck → unit tests → build → deploy to QA.
- CD gating: Staging deploy only after QA approval + security sign-off.
- Playwright cloud runs nightly; Vitest coverage target ≥ 80% statements.
- Dependency updates tracked via Renovate, but paused until Phase 4.

## 7. Risk & Mitigation Matrix
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Credential rotation breaks existing services | High | Staged rollout, update secrets per env, smoke test before cutover |
| Social APIs quota limits | Medium | Implement rate limiting + alerting, coordinate posting windows |
| Schema refactors break legacy data | High | Run migration in shadow DB first, snapshot backup, add data integrity tests |
| Strict TS reveals extensive errors | Medium | Schedule fix buffers in Phase 4, prioritize by risk |

## 8. Communication Cadence
- **Daily pod stand-ups**, **twice-weekly program sync**, **weekly executive update**.
- Status dashboard: Notion + Slack channel `#ocma-overhaul` with automated build/test updates.
- All decisions logged in `docs/decisions/ADR-*.md`.

## 9. Definition of Done
1. All audit findings resolved with evidence in PR descriptions.
2. Program QA environment green across unit, integration, and e2e suites.
3. Security review checklist signed by Priya & Alex.
4. Runbooks delivered, team onboarding updated.
5. Stakeholder demo recorded and archived.

## 10. Next Actions Checklist
- [ ] Create program branch `program/ocma-overhaul`.
- [ ] Provision QA Vercel + Supabase environment.
- [ ] Configure CI pipeline for branch deployments.
- [ ] Kick-off meeting notes circulated.

