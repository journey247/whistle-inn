# GitHub Copilot - AI Agent Instructions

This project uses specialized AI agents for different aspects of development.

## Agent Roles

### ai-engineer (engineering)

Specialized agent for engineering tasks. See detailed instructions in `.github/engineering/ai-engineer.md`

### backend-architect (engineering)

Specialized agent for engineering tasks. See detailed instructions in `.github/engineering/backend-architect.md`

### devops-automator (engineering)

Specialized agent for engineering tasks. See detailed instructions in `.github/engineering/devops-automator.md`

### frontend-developer (engineering)

Specialized agent for engineering tasks. See detailed instructions in `.github/engineering/frontend-developer.md`

### mobile-app-builder (engineering)

Specialized agent for engineering tasks. See detailed instructions in `.github/engineering/mobile-app-builder.md`

### rapid-prototyper (engineering)

Specialized agent for engineering tasks. See detailed instructions in `.github/engineering/rapid-prototyper.md`

### test-writer-fixer (engineering)

Specialized agent for engineering tasks. See detailed instructions in `.github/engineering/test-writer-fixer.md`

### brand-guardian (design)

Specialized agent for design tasks. See detailed instructions in `.github/design/brand-guardian.md`

### ui-designer (design)

Specialized agent for design tasks. See detailed instructions in `.github/design/ui-designer.md`

### ux-researcher (design)

Specialized agent for design tasks. See detailed instructions in `.github/design/ux-researcher.md`

### visual-storyteller (design)

Specialized agent for design tasks. See detailed instructions in `.github/design/visual-storyteller.md`

### whimsy-injector (design)

Specialized agent for design tasks. See detailed instructions in `.github/design/whimsy-injector.md`

### app-store-optimizer (marketing)

Specialized agent for marketing tasks. See detailed instructions in `.github/marketing/app-store-optimizer.md`

### content-creator (marketing)

Specialized agent for marketing tasks. See detailed instructions in `.github/marketing/content-creator.md`

### growth-hacker (marketing)

Specialized agent for marketing tasks. See detailed instructions in `.github/marketing/growth-hacker.md`

### instagram-curator (marketing)

Specialized agent for marketing tasks. See detailed instructions in `.github/marketing/instagram-curator.md`

### reddit-community-builder (marketing)

Specialized agent for marketing tasks. See detailed instructions in `.github/marketing/reddit-community-builder.md`

### tiktok-strategist (marketing)

Specialized agent for marketing tasks. See detailed instructions in `.github/marketing/tiktok-strategist.md`

### twitter-engager (marketing)

Specialized agent for marketing tasks. See detailed instructions in `.github/marketing/twitter-engager.md`

### feedback-synthesizer (product)

Specialized agent for product tasks. See detailed instructions in `.github/product/feedback-synthesizer.md`

### sprint-prioritizer (product)

Specialized agent for product tasks. See detailed instructions in `.github/product/sprint-prioritizer.md`

### trend-researcher (product)

Specialized agent for product tasks. See detailed instructions in `.github/product/trend-researcher.md`

### analytics-reporter (studio-operations)

Specialized agent for studio-operations tasks. See detailed instructions in `.github/studio-operations/analytics-reporter.md`

### finance-tracker (studio-operations)

Specialized agent for studio-operations tasks. See detailed instructions in `.github/studio-operations/finance-tracker.md`

# GitHub Copilot — Project Instructions (whistle-inn)

This file tells AI coding agents how this repository is structured, how to run important workflows, and where to look for the code paths that commonly cause build/deploy issues.

# GitHub Copilot — Agent Instructions (whistle-inn)

Purpose: ensure AI coding agents can make safe, high‑impact edits and understand the repo's build/deploy pitfalls.

Quick commands
- Dev server: npm run dev
- Prod build: npm run build  (runs `prisma generate` then `next build`)
- Regenerate Prisma: rm -rf node_modules/.prisma && npx prisma generate
- Create admin helper: npm run create-admin

High-level architecture (what to read first)
- Frontend: Next.js (app router) in `src/app` — server components by default; root layout is `src/app/layout.tsx`.
- Client UI: `src/components` (client-only components must include `"use client"`). Important files: `content/ContentProvider.tsx`, `ui/toast-context.tsx`, `ClientProviders.tsx`, `HeroImageSlider.tsx`.
- Backend: Next route handlers in `src/app/api/**/route.ts` and helpers in `src/lib` (prisma, email, sms, stripe, ical).
- Database: Prisma schema in `prisma/schema.prisma` (client generated during build).

Project-specific rules & gotchas
- Server vs Client boundaries: never import client-hook-using modules into server components that run at build time (e.g., `_global-error` or `layout`). If you see "Cannot read properties of null (reading 'useContext')" during prerender, trace imports for client hooks.
- Global error page: `src/app/_global-error/page.tsx` and `src/app/not-found/page.tsx` must avoid importing client code; mark `export const dynamic = 'force-dynamic'` or move client code behind a client wrapper.
- Prisma on Windows: watch for EPERM when `prisma generate` renames native engines — kill processes locking `node_modules/.prisma` and delete `.prisma` tmp files before regenerating.
- Toast & content providers: patterns use a client provider + a server-safe fallback. See `src/components/ui/toast-context.tsx` and `src/components/content/ContentProvider.tsx` for examples.

Where to look for common changes
- Edit UI/providers safely: `src/components/ClientProviders.tsx` (wraps client providers), and `src/app/layout.tsx` (server layout).
- API hooks: `src/lib/prisma.ts`, `src/lib/sms.ts` (SMS is stubbed), `src/lib/email.ts`, `src/lib/ical-sync-scheduler.ts`.
- Scripts & migrations: `scripts/` and `prisma/migrations/`.

Safe edit checklist for agents
1. Read the failing stack trace from `npm run build` and identify the first server file that failed prerendering.
2. Open that file and print its import graph (which modules it imports). Check each import for `"use client"` or hook usage.
3. If a client hook is imported, either:
   - convert the imported component to a client wrapper (add `"use client"`) and import the wrapper only from client entry, or
   - mark the page `export const dynamic = 'force-dynamic'` if runtime behavior is required.
4. For Prisma errors on Windows: stop Node processes, remove tmp `.prisma` files, then run `npx prisma generate`.

Examples (concrete patterns)
- Convert a provider to client-only: add `"use client"` at the top of `src/components/content/ContentProvider.tsx` and import it from `PageClient` or `ClientProviders`, not from server components.
- Global-error safety: keep `src/app/_global-error/page.tsx` minimal and avoid importing `useToast`/`useContent` directly.

If anything here is unclear or you want me to expand a short checklist into a runnable codemod (e.g., wrap client imports automatically), tell me which area to expand.
