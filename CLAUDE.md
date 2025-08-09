# OCMA Project Context

## Overview
This is the OCMA (Open Contract Management Application) project - a modern contract management system built with Next.js and Supabase.

## Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions

## Project Structure
```
/workspaces/ocma/
├── src/                    # Source code
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   ├── lib/              # Utilities and libraries
│   └── types/            # TypeScript type definitions
├── supabase/              # Supabase configuration
│   ├── functions/        # Edge Functions
│   └── migrations/       # Database migrations
├── public/                # Static assets
└── tests/                 # Test files
```

## Key Commands
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Testing & Quality
npm run lint            # Run ESLint
npm run typecheck       # Run TypeScript type checking
npm run test            # Run tests

# Database
npm run db:push         # Push database migrations
npm run db:reset        # Reset database

# Supabase
npx supabase start      # Start local Supabase
npx supabase stop       # Stop local Supabase
npx supabase functions serve  # Serve Edge Functions locally
```

## Environment Variables
The project uses `.env.local` for environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

## Important Files
- `package.json` - Project dependencies and scripts
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `.github/workflows/` - GitHub Actions workflows

## Development Guidelines
1. Always run `npm run lint` and `npm run typecheck` before committing
2. Follow existing code patterns and conventions
3. Use TypeScript for type safety
4. Components should be in the `src/components` directory
5. API routes and server actions go in `src/app/api`
6. Supabase Edge Functions are in `supabase/functions`

## Common Tasks
- **Adding a new page**: Create in `src/app/[route]/page.tsx`
- **Adding a component**: Create in `src/components/`
- **Adding an API route**: Create in `src/app/api/[route]/route.ts`
- **Adding a database migration**: Use `npx supabase migration new [name]`
- **Adding an Edge Function**: Create in `supabase/functions/[name]/index.ts`

## Recent Updates
- Fixed GitHub Actions to use v4 artifact actions
- Fixed Supabase Edge Functions for Deno compatibility
- Added missing npm scripts for lint and typecheck

## coding team
for all coding and functionality issues and questions use a team made up of the worlds best experts as follows:
coding expert
systems integrator
ai integrations specialist
seo optimization expert
ux/ui expert

## coding practices
Always adhere to high spec coding standards
Always understand the full context of the problem or issue or bug
always test fully, including in a simulated live environment, all fixes to ensure no bugs persist. then retest again
Make a plan for fixing a problem or updating code or functionality. after the plan is approved by me you are to implement it without any further permissions from me. Implement autonomously 
create a plan.md and update it for progress and new plans.
