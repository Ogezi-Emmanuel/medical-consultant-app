import { NextResponse } from "next/server"
import { supabaseServerWithAuth } from "@/lib/supabase"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined

  const cookies = {
    get: (name: string) => {
      const cookie = request.headers.get("cookie") ?? ""
      const match = cookie.split("; ").find((c) => c.startsWith(`${name}=`))
      return match?.split("=")[1]
    },
    set: () => {},
    remove: () => {},
  }
  const supabase = supabaseServerWithAuth(token, cookies)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("consultations")
    .select("id, topic, status, started_at, summary, consultation_messages!inner(id)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const unique = new Map<string, { id: string; topic: string; status: string; started_at: string; summary: string | null }>()
  for (const c of (data ?? [])) {
    if (!unique.has(c.id)) {
      unique.set(c.id, {
        id: c.id,
        topic: c.topic,
        status: c.status,
        started_at: c.started_at,
        summary: c.summary ?? null,
      })
    }
  }

  return NextResponse.json({ items: Array.from(unique.values()) })
}