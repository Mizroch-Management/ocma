# OCMA Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Vercel account
- Supabase account
- Social media API credentials (optional)
- Analytics accounts (Sentry, PostHog - optional)

## Environment Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-org/ocma.git
cd ocma
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure the following variables:

#### Required Variables

```env
# Supabase (Public)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase (Server-only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Optional Variables

```env
# AI Platforms
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Social Media
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

# Analytics
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_POSTHOG_API_KEY=phc_...

```

## Database Setup

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create new project
3. Save the project URL and keys

### 2. Run Migrations

```bash
# Start Supabase locally (optional)
npx supabase start

# Run migrations
npx supabase db push

# Or apply directly to remote
npx supabase db push --db-url postgresql://...
```

### 3. Enable Required Extensions

In Supabase SQL Editor, run:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
```

### 4. Set Up RLS Policies

The migrations include RLS policies, but verify they're enabled:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

## Vercel Deployment

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Deploy to Vercel

```bash
vercel
```

Follow the prompts:
- Link to existing project or create new
- Configure project settings
- Set environment variables

### 3. Configure Environment Variables in Vercel

Go to your Vercel project settings and add all environment variables:

1. Navigate to Settings → Environment Variables
2. Add each variable for Production, Preview, and Development
3. Save changes

### 4. Configure Domains

In Vercel project settings:
1. Go to Domains
2. Add your custom domain
3. Configure DNS as instructed

## Social Media API Setup

### Twitter/X

1. Apply for Twitter API access at [developer.twitter.com](https://developer.twitter.com)
2. Create an app with OAuth 2.0 settings
3. Set callback URL: `https://your-domain.vercel.app/api/connect/twitter/callback`
4. Copy Client ID and Client Secret

### Facebook/Instagram

1. Create app at [developers.facebook.com](https://developers.facebook.com)
2. Add Instagram Basic Display or Instagram Graph API
3. Set OAuth Redirect URI
4. Configure app review for necessary permissions

### LinkedIn

1. Create app at [developer.linkedin.com](https://developer.linkedin.com)
2. Request OAuth 2.0 scopes: `w_member_social`
3. Set redirect URL
4. Copy Client ID and Secret

## Scheduling Automation

Redis and third-party queues are no longer required. Scheduled publishing is handled by Supabase Edge Functions:

- `schedule-post` – queues content for future publication.
- `cancel-scheduled-post` – aborts a pending post.
- `publish-scheduled-content` – manual fallback trigger (rate limited to 3 calls/minute per organization).

> Make sure your Vercel project exposes the Supabase service-role key as a **server-side only** secret so these functions can insert into `scheduled_posts`.

### QA Environment Checklist

1. Provision the QA Vercel project and Supabase shadow project listed in `environments/qa/README.md`.
2. Run `npx supabase db push --project-ref <qa-ref>` to apply migrations (including `20250821120000_add_organization_scoping.sql`).
3. Populate QA secrets using the example in `environments/qa/.env.qa.example`.
4. Deploy via the `Program QA Deploy` GitHub Action (push to `program/ocma-overhaul`).

Once the environment is ready you can test scheduling end-to-end by hitting the new Edge Functions with a QA session token.

## Analytics Setup

### Sentry

1. Create project at [sentry.io](https://sentry.io)
2. Copy DSN from project settings
3. Configure source maps upload in `vite.config.ts`:

```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default {
  plugins: [
    sentryVitePlugin({
      org: "your-org",
      project: "ocma",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
};
```

### PostHog

1. Sign up at [posthog.com](https://posthog.com)
2. Create project
3. Copy API key
4. Configure in environment variables

## Testing Deployment

### 1. Health Check

```bash
curl https://your-domain.vercel.app/api/config
```

### 2. Test Authentication

1. Navigate to `https://your-domain.vercel.app`
2. Sign up for new account
3. Verify email (check Supabase Auth logs)
4. Login successfully

### 3. Test Social Connections

1. Go to Settings
2. Connect a social account
3. Run test post
4. Check connector health

### 4. Test Content Creation

1. Create AI-generated content
2. Schedule a post
3. Verify in calendar view
4. Check job queue processing

## Monitoring

### Application Logs

View in Vercel dashboard:
- Functions tab → View logs
- Filter by function name
- Check for errors

### Database Monitoring

In Supabase dashboard:
- Database → Query Performance
- Auth → Logs
- Storage → Usage

### Analytics Dashboard

- Sentry: Error tracking and performance
- PostHog: User behavior and funnels

## Troubleshooting

### Common Issues

#### "Unauthorized" after login
- Check RLS policies are enabled
- Verify auth callback route
- Check session persistence

#### Social posting fails
- Verify API credentials
- Check OAuth scopes
- Review token expiration

#### Jobs not processing
- Verify cron/QStash configuration
- Check job queue table
- Review function logs

### Debug Mode

Enable debug logging:

```env
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

### Support

For issues:
1. Check error logs in Sentry
2. Review Vercel function logs
3. Check Supabase logs
4. Open issue on GitHub

## Security Checklist

- [ ] All secrets in environment variables
- [ ] RLS policies enabled and tested
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection enabled
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Regular dependency updates

## Backup Strategy

### Database Backups

Supabase provides automatic daily backups. For additional backup:

```bash
# Export database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Code Backups

- Use Git tags for releases
- Keep production branch protected
- Regular commits to version control

## Scaling Considerations

### Performance Optimization

1. Enable Vercel Edge Functions for global distribution
2. Use Supabase connection pooling
3. Implement caching strategy
4. Optimize images with CDN

### Cost Management

Monitor usage:
- Vercel: Function invocations and bandwidth
- Supabase: Database size and API calls
- AI APIs: Token usage
- Social APIs: Rate limits

## Maintenance

### Regular Updates

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update major versions carefully
npm install package@latest
```

### Database Maintenance

```sql
-- Analyze tables for query optimization
ANALYZE;

-- Vacuum to reclaim space
VACUUM;

-- Reindex for better performance
REINDEX DATABASE your_database;
```
