import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseServer } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const ProfileSchema = z.object({
  age: z.number().int().nonnegative().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  blood_type: z.enum(["A+","A-","B+","B-","AB+","AB-","O+","O-"]).optional(),
})

export async function GET(request: Request) {
  // Prefer bearer token context for RLS, fallback to cookie-based SSR client
  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined

  const supabase = token
    ? createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
    : supabaseServer({
        get: (name: string) => {
          const cookie = request.headers.get("cookie") ?? ""
          const match = cookie.split("; ").find((c) => c.startsWith(`${name}=`))
          return match?.split("=")[1]
        },
        set: () => {},
        remove: () => {},
      })

  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Rely on RLS to scope to the authenticated user's row (profiles has unique user_id)
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ profile: data ?? null })
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = ProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  // Prepare response for cookie propagation when using SSR client
  const response = NextResponse.json({ ok: true })

  const authHeader2 = request.headers.get("authorization") ?? ""
  const token2 = authHeader2.startsWith("Bearer ") ? authHeader2.slice(7) : undefined

  const supabase = token2
    ? createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: `Bearer ${token2}` } } })
    : supabaseServer({
        get: (name: string) => {
          const cookie = request.headers.get("cookie") ?? ""
          const match = cookie.split("; ").find((c) => c.startsWith(`${name}=`))
          return match?.split("=")[1]
        },
        set: (name, value, options) => {
          response.cookies.set(name, value, options)
        },
        remove: (name, options) => {
          response.cookies.set(name, "", { ...options, maxAge: 0 })
        },
      })

  const { data: { user } } = token2 ? await supabase.auth.getUser(token2) : await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const payload = { ...parsed.data, user_id: user.id }

  // Upsert profile scoped by RLS via the authenticated context
  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ profile: data })
}