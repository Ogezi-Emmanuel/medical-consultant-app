import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

export async function POST(request: Request) {
  const response = NextResponse.json({})

  const supabase = supabaseServer({
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

  let payload: any
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const mode = payload?.mode as "password" | "magiclink" | undefined
  const email = payload?.email as string | undefined

  if (!mode || !email) {
    return NextResponse.json({ error: "Missing required fields: mode, email" }, { status: 400 })
  }

  if (mode === "password") {
    const password = payload?.password as string | undefined
    if (!password) {
      return NextResponse.json({ error: "Missing required field: password" }, { status: 400 })
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    // Session cookie will be set via supabaseServer cookie bridge
    return NextResponse.json({ user: data.user })
  }

  if (mode === "magiclink") {
    // Optional redirect to current origin
    const origin = request.headers.get("origin") ?? undefined
    const emailRedirectTo = origin ? `${origin}/` : undefined

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo,
      },
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ sent: true })
  }

  return NextResponse.json({ error: "Unsupported mode" }, { status: 400 })
}