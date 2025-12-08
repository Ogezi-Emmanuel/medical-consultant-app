import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseServer } from "@/lib/supabase"

const AllergyCreateSchema = z.object({
  name: z.string().min(1, "Allergy name is required"),
  note: z.string().optional(),
})

const AllergyDeleteSchema = z.object({
  id: z.string().uuid(),
})

function createSupabaseForRequest(request: Request, response?: NextResponse) {
  return supabaseServer({
    get: (name: string) => {
      const cookie = request.headers.get("cookie") ?? ""
      const match = cookie.split("; ").find((c) => c.startsWith(`${name}=`))
      return match?.split("=")[1]
    },
    set: (name: string, value: string, options) => {
      response?.cookies.set(name, value, options)
    },
    remove: (name: string, options) => {
      response?.cookies.set(name, "", { ...options, maxAge: 0 })
    },
  })
}

export async function GET(request: Request) {
  const supabase = createSupabaseForRequest(request)
  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("allergies")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = AllergyCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  const supabase = createSupabaseForRequest(request, response)

  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const payload = { user_id: user.id, ...parsed.data }
  const { data, error } = await supabase
    .from("allergies")
    .insert(payload)
    .select("*")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = AllergyDeleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  const supabase = createSupabaseForRequest(request, response)

  const authHeader2 = request.headers.get("authorization") ?? ""
  const token2 = authHeader2.startsWith("Bearer ") ? authHeader2.slice(7) : undefined
  const { data: { user } } = token2 ? await supabase.auth.getUser(token2) : await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("allergies")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ item: data })
}