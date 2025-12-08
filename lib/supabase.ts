import { createClient } from "@supabase/supabase-js"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseBrowser = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Helper to create a server-side Supabase client in API routes and server components
export function supabaseServer(cookies: {
  get: (name: string) => string | undefined
  set: (name: string, value: string, options: CookieOptions) => void
  remove: (name: string, options: CookieOptions) => void
}) {
  return createServerClient(url, anon, { cookies })
}

// Helper to create a server-side Supabase client that propagates a Bearer access token
// for RLS-safe queries when available. Falls back to cookie-based SSR client.
export function supabaseServerWithAuth(
  token: string | undefined,
  cookies: {
    get: (name: string) => string | undefined
    set: (name: string, value: string, options: CookieOptions) => void
    remove: (name: string, options: CookieOptions) => void
  }
) {
  if (token) {
    // Use a direct client with global Authorization header for RLS
    return createClient(url, anon, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }
  // No token provided, use cookie-based SSR client
  return createServerClient(url, anon, { cookies })
}