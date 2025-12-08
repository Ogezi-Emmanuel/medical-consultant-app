import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true })

  const supabase = supabaseServer({
    get: (name: string) => {
      const cookie = request.headers.get("cookie") ?? ""
      const match = cookie
        .split("; ")
        .find((c) => c.startsWith(`${name}=`))
      return match?.split("=")[1]
    },
    set: (name, value, options) => {
      response.cookies.set(name, value, options)
    },
    remove: (name, options) => {
      response.cookies.set(name, "", { ...options, maxAge: 0 })
    },
  })

  await supabase.auth.signOut()
  return response
}