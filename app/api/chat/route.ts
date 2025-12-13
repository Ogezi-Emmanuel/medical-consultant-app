import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseServer, supabaseServerWithAuth } from "@/lib/supabase"
import { ensureVerified, getGeminiModel, generateTextStream } from "@/lib/gemini"

const ChatSchema = z.object({
  messages: z.array(
    z.object({ role: z.enum(["user","assistant","system"]).default("user"), content: z.string().min(1) })
  ).min(1),
  context: z.object({
    allergies: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
  }).optional(),
  consultation_id: z.string().uuid().optional(),
  stream: z.boolean().optional(),
})

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str
}

// Simple in-memory rate limiter for anonymous users (dev-use only)
const anonRateMap = new Map<string, number[]>()
const MAX_PER_MINUTE_AUTH = 20
const MAX_PER_MINUTE_ANON = 10

function recordAnonHit(key: string) {
  const now = Date.now()
  const windowStart = now - 60_000
  const arr = anonRateMap.get(key) ?? []
  const pruned = arr.filter(t => t >= windowStart)
  pruned.push(now)
  anonRateMap.set(key, pruned)
  return pruned.length
}

function getClientIp(req: Request) {
  const xfwd = req.headers.get("x-forwarded-for")
  if (xfwd) return xfwd.split(",")[0].trim()
  const ip = req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip")
  return ip ?? "anon"
}

export async function GET(request: Request) {
  const { ok, error, model } = await ensureVerified()
  return NextResponse.json({ ok, model, error }, { status: ok ? 200 : 500 })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = ChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  // Capture cookie operations to apply on final response
  const cookieOps: { type: "set" | "remove"; name: string; value?: string; options?: any }[] = []
  const cookies = {
    get: (name: string) => {
      const cookie = request.headers.get("cookie") ?? ""
      const match = cookie.split("; ").find((c) => c.startsWith(`${name}=`))
      return match?.split("=")[1]
    },
    set: (name: string, value: string, options: any) => {
      cookieOps.push({ type: "set", name, value, options })
    },
    remove: (name: string, options: any) => {
      cookieOps.push({ type: "remove", name, options })
    },
  }

  const { ok, error } = await ensureVerified()
  if (!ok) {
    const res = NextResponse.json({ error: `Gemini API verification failed: ${error}` }, { status: 500 })
    for (const op of cookieOps) {
      if (op.type === "set" && op.value !== undefined) res.cookies.set(op.name, op.value, op.options)
      if (op.type === "remove") res.cookies.set(op.name, "", { ...op.options, maxAge: 0 })
    }
    return res
  }

  try {
    const model = getGeminiModel()
    const { messages, context, consultation_id: initialConsultationId, stream } = parsed.data
    const systemPrompt = `You are a medical consultation assistant. Be helpful, cautious, and avoid definitive diagnoses. If uncertain, ask follow-up questions.`
    const contextText = context ? `\nAllergies: ${context.allergies?.join(", ") ?? "None"}\nMedications: ${context.medications?.join(", ") ?? "None"}\nConditions: ${context.conditions?.join(", ") ?? "None"}` : ""

    const userText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
    const prompt = `${systemPrompt}\n${contextText}\n\nConversation:\n${userText}`

    // Prepare Supabase client with RLS-safe token propagation
    const authHeader = request.headers.get("authorization") ?? ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined
    const supabase = supabaseServerWithAuth(token, cookies)
    const { data: { user } } = await supabase.auth.getUser()

    // Server-side rate limiting
    if (user) {
      // Count user's recent messages within the last minute (RLS restricts to own rows)
      const sinceIso = new Date(Date.now() - 60_000).toISOString()
      const { count } = await supabase
        .from("consultation_messages")
        .select("id", { count: "exact", head: true })
        .eq("role", "user")
        .gte("created_at", sinceIso)

      if ((count ?? 0) >= MAX_PER_MINUTE_AUTH) {
        const res = NextResponse.json({ error: "Rate limit exceeded. Please wait a minute before sending more messages." }, { status: 429 })
        for (const op of cookieOps) {
          if (op.type === "set" && op.value !== undefined) res.cookies.set(op.name, op.value, op.options)
          if (op.type === "remove") res.cookies.set(op.name, "", { ...op.options, maxAge: 0 })
        }
        return res
      }
    } else {
      const ipKey = getClientIp(request)
      const hits = recordAnonHit(ipKey)
      if (hits >= MAX_PER_MINUTE_ANON) {
        const res = NextResponse.json({ error: "Rate limit exceeded for anonymous users. Please sign in or wait." }, { status: 429 })
        for (const op of cookieOps) {
          if (op.type === "set" && op.value !== undefined) res.cookies.set(op.name, op.value, op.options)
          if (op.type === "remove") res.cookies.set(op.name, "", { ...op.options, maxAge: 0 })
        }
        return res
      }
    }

    if (stream) {
      let aggregated = ""
      let consultationId = initialConsultationId ?? null
      const generator = await generateTextStream(prompt)

      const streamBody = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder()
          try {
            console.log("[api/chat] streaming reply started; user=", user?.id ?? "anon", "consultation=", consultationId ?? "none")
            for await (const delta of generator) {
              aggregated += delta
              // SSE: each chunk is sent as an event data line, separated by blank line
              controller.enqueue(encoder.encode(`data: ${delta}\n\n`))
              // Mirror to terminal
              console.log("[api/chat] stream delta:", delta)
            }

            // After streaming completes, persist messages for authenticated users
            if (user) {
              // Ensure we have a consultation id
              if (!consultationId) {
                const firstUserMsg = messages.find(m => m.role === "user")?.content ?? "General consultation"
                const { data: created, error: consultErr } = await supabase
                  .from("consultations")
                  .insert({ user_id: user.id, topic: truncate(firstUserMsg, 80), status: "open" })
                  .select("*")
                  .maybeSingle()
                if (!consultErr && created) {
                  consultationId = created.id
                }
              }

              if (consultationId) {
                // Last user message
                const lastUserMsg = [...messages].reverse().find(m => m.role === "user")
                if (lastUserMsg) {
                  await supabase
                    .from("consultation_messages")
                    .insert({ consultation_id: consultationId, role: "user", content: lastUserMsg.content })
                }
                // Assistant reply
                await supabase
                  .from("consultation_messages")
                  .insert({ consultation_id: consultationId, role: "assistant", content: aggregated })
              }
            }

            // Send SSE end marker for clients that expect explicit completion
            controller.enqueue(encoder.encode(`event: end\n` + `data: [DONE]\n\n`))
            console.log("[api/chat] stream completed; length=", aggregated.length)
            controller.close()
          } catch (e: any) {
            const errorText = e?.message ?? "Streaming failed"
            console.error("[api/chat] stream error:", errorText)
            // Emit SSE error line so client can surface the failure
            controller.enqueue(encoder.encode(`event: error\n` + `data: ${errorText}\n\n`))
            controller.close()
          }
        }
      })

      const res = new NextResponse(streamBody, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "x-vercel-ai-ui-message-stream": "v1",
        }
      })
      for (const op of cookieOps) {
        if (op.type === "set" && op.value !== undefined) res.cookies.set(op.name, op.value, op.options)
        if (op.type === "remove") res.cookies.set(op.name, "", { ...op.options, maxAge: 0 })
      }
      return res
    }

    // Non-streaming path
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    console.log("[api/chat] non-stream reply length:", text.length, "user=", user?.id ?? "anon")
    console.log("[api/chat] non-stream reply preview:", truncate(text, 200))

    // Persist to Supabase if user is authenticated
    let consultationId = initialConsultationId ?? null
    if (user) {
      // Ensure we have a consultation id
      if (!consultationId) {
        const firstUserMsg = messages.find(m => m.role === "user")?.content ?? "General consultation"
        const { data: created, error: consultErr } = await supabase
          .from("consultations")
          .insert({ user_id: user.id, topic: truncate(firstUserMsg, 80), status: "open" })
          .select("*")
          .maybeSingle()
        if (!consultErr && created) {
          consultationId = created.id
        }
      }

      if (consultationId) {
        // Last user message
        const lastUserMsg = [...messages].reverse().find(m => m.role === "user")
        if (lastUserMsg) {
          await supabase
            .from("consultation_messages")
            .insert({ consultation_id: consultationId, role: "user", content: lastUserMsg.content })
        }
        // Assistant reply
        await supabase
          .from("consultation_messages")
          .insert({ consultation_id: consultationId, role: "assistant", content: text })
      }
    }

    const res = NextResponse.json({ reply: text, consultation_id: consultationId ?? null })
    for (const op of cookieOps) {
      if (op.type === "set" && op.value !== undefined) res.cookies.set(op.name, op.value, op.options)
      if (op.type === "remove") res.cookies.set(op.name, "", { ...op.options, maxAge: 0 })
    }
    return res
  } catch (err: any) {
    const res = NextResponse.json({ error: err?.message ?? "Chat failed" }, { status: 500 })
    for (const op of cookieOps) {
      if (op.type === "set" && op.value !== undefined) res.cookies.set(op.name, op.value, op.options)
      if (op.type === "remove") res.cookies.set(op.name, "", { ...op.options, maxAge: 0 })
    }
    return res
  }
}