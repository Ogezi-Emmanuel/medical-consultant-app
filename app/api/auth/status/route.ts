import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

export async function GET(request: Request) {
  const supabase = supabaseServer({
    get: (name: string) => {
      const cookie = request.headers.get("cookie") ?? ""
      const match = cookie.split("; ").find((c) => c.startsWith(`${name}=`))
      return match?.split("=")[1]
    },
    set: () => {},
    remove: () => {},
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const verified = !!(user.email_confirmed_at ?? null)
  return NextResponse.json({ verified })
}