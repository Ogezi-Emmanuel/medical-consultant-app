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
   - Create `.env` locally with the variables listed below
4. Run the dev server
   - `pnpm dev` and open http://localhost:3000

## 2. Deployment

This project can be deployed on any Node.js hosting provider that supports Next.js (e.g., Netlify, Render, Railway, Fly.io, or a custom Node server). No provider-specific configuration is required.

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
- `next.config.mjs` — Next.js configuration
- `supabase_schema.sql` — Database schema and RLS policies

## Local Development

- Start: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Test: `pnpm vitest`

## Deployment Tips

- Ensure all required env vars are present on your hosting provider
- Supabase RLS requires authenticated requests; ensure client auth tokens are propagated (already handled by server helpers)

## License

This project includes third-party dependencies. Review each license as needed.