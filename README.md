# Medical Consultant App

A Next.js 16 application that provides AI-assisted medical consultations with Supabase-backed persistence and RLS-safe APIs.

## 1. Project Setup

Prerequisites:
- Node.js 18 or 20 (recommended)
- PNPM (preferred) or npm/yarn
- A Supabase project with the provided schema
- A Google/Gemini API key

Setup steps:
1. Clone the repository
2. Install dependencies
   - Using PNPM: `pnpm install`
   - Using npm: `npm install`
3. Configure environment variables
   - Copy `.env` from Vercel (see Deployment) or create it locally with the variables listed below
4. Run the dev server
   - `pnpm dev` and open http://localhost:3000

## 2. Deployment to Vercel

This project is pre-configured for Vercel with `vercel.json` and convenient CLI scripts in `package.json`.

Vercel CLI (first-time setup):
- Login: `pnpm vercel:login`
- Link project: `pnpm vercel:link` (choose or create a Vercel project)

Environment configuration on Vercel:
- Add your environment variables to Vercel (Preview and Production):
  - `vercel env add GEMINI_API_KEY`
  - `vercel env add NEXT_PUBLIC_SUPABASE_URL`
  - `vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - If you use `GOOGLE_API_KEY` instead of `GEMINI_API_KEY`, add that too
- Pull envs to local `.env` when needed:
  - `pnpm vercel:pull`

Deploy:
- Preview deployment: `pnpm vercel:deploy`
- Production deployment: `pnpm vercel:deploy:prod`

Notes:
- The build, dev, and install commands are defined in `vercel.json`
- Serverless function limits (duration/memory) are configured in `vercel.json` for API routes

## 3. Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (public)
- `GEMINI_API_KEY` — Google Gemini API key (or `GOOGLE_API_KEY` as fallback)

Optional:
- None at this time

Where they are used:
- Supabase client configuration in `lib/supabase.ts`
- Gemini model verification and generation in `lib/gemini.ts`

Supabase Schema:
- The repository includes `supabase_schema.sql`. Apply it to your Supabase project to create tables and RLS policies.

## 4. Runtime Requirements

- Node.js: >= 18 (project declares this in `package.json` engines). Node 20 is recommended.
- Next.js: 16.x
- React: 19.x
- Vercel
  - Serverless Functions for App Router API (`app/api/**`)
  - Function limits configured via `vercel.json` (maxDuration: 60s, memory: 1024MB)
- Streaming responses
  - `/api/chat` supports NDJSON streaming for AI responses and persists messages after streaming completes

## 5. Project Structure Overview

- `app/` — Next.js App Router pages and API routes
  - `app/api/` — RLS-safe API endpoints
    - `consultations/route.ts` — List user consultations ordered by `started_at`
    - `consultations/[id]/messages/route.ts` — Fetch messages by consultation id
    - `chat/route.ts` — Chat endpoint (streaming and non-streaming) with Supabase persistence
    - `auth/` — Authentication helpers (status/signout)
    - `profile/` — User profile CRUD (RLS)
  - `app/consultation/page.tsx` — Chat UI with history loading by `consultation_id`
  - `app/dashboard/page.tsx` — Consultation history linking to records by id
  - `app/page.tsx` — Home page (recent consultations)
- `components/` — UI components and navigation
- `lib/` — Supabase and Gemini helpers
  - `supabase.ts` — Browser and server clients with Authorization token propagation
  - `gemini.ts` — Model helpers and verification
- `public/` — Static assets
- `styles/` — Global styles
- `tests/` — Vitest tests
  - `api.chat.spec.ts` — Tests for `/api/chat` behavior
- `vercel.json` — Vercel configuration (build/install/dev commands, functions limits)
- `next.config.mjs` — Next.js configuration
- `supabase_schema.sql` — Database schema and RLS policies

## Local Development

- Start: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Test: `pnpm vitest`

## Vercel CLI Scripts (package.json)

- `pnpm vercel:login` — Login to Vercel
- `pnpm vercel:link` — Link local project to a Vercel project
- `pnpm vercel:pull` — Pull env vars to `.env`
- `pnpm vercel:dev` — Run Vercel dev (optional, standard `pnpm dev` works too)
- `pnpm vercel:build` — Build using Vercel CLI
- `pnpm vercel:deploy` — Deploy preview
- `pnpm vercel:deploy:prod` — Deploy production

## Deployment Tips

- Ensure all required env vars are present on Vercel for both Preview and Production
- Use `vercel env pull .env` to sync envs locally
- Check Vercel function logs for `/api/chat` and other routes for rate limiting behavior
- Supabase RLS requires authenticated requests; ensure client auth tokens are propagated (already handled by server helpers)

## License

This project includes third-party dependencies. Review each license as needed.