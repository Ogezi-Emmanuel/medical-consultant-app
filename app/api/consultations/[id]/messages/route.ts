import { NextResponse, NextRequest } from "next/server"
import { supabaseServerWithAuth } from "@/lib/supabase"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: "Missing consultation id" }, { status: 400 })

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

  // Fetch messages for the given consultation id. RLS ensures user can only access their own data.
  const { data, error } = await supabase
    .from("consultation_messages")
    .select("id, role, content, created_at")
    .eq("consultation_id", id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ items: data ?? [] })
}