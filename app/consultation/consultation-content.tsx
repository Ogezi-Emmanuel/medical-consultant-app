"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import useSWR from "swr"
import { Send, Paperclip, AlertCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabaseBrowser } from "@/lib/supabase"
import { useSearchParams } from "next/navigation"

// Authenticated fetcher that attaches Supabase session token
const fetcherWithAuth = async (url: string) => {
  const { data: { session } } = await supabaseBrowser.auth.getSession()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
  const res = await fetch(url, { credentials: "include", headers })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error ?? `Failed to fetch ${url}`)
  }
  return res.json()
}

export default function ConsultationContent() {
  const [messages, setMessages] = useState<{
    id: number
    role: "assistant" | "user"
    content: string
    timestamp: Date
  }[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Hello! I'm your AI medical consultant. How can I assist you today? Please describe your symptoms or health concerns.",
      timestamp: new Date(Date.now() - 300000),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Track auth token to avoid premature requests without Authorization header
  const [token, setToken] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    let mounted = true
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setToken(session?.access_token ?? null)
    })
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (mounted) setToken(session?.access_token ?? null)
    })
    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  // Read consultation id from URL and load existing messages
  const searchParams = useSearchParams()
  useEffect(() => {
    if (!isMounted) return
    const id = searchParams.get("consultation_id")
    if (id) setConsultationId(id)
  }, [searchParams, isMounted])

  const { data: existingMessages } = useSWR<{ items: { id: string; role: "user" | "assistant"; content: string; created_at: string }[] }>(
    consultationId && token ? `/api/consultations/${consultationId}/messages` : null,
    fetcherWithAuth
  )

  useEffect(() => {
    if (existingMessages?.items && existingMessages.items.length > 0) {
      const formatted = existingMessages.items
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((m, idx) => ({ id: idx + 1, role: m.role, content: m.content, timestamp: new Date(m.created_at) }))
      setMessages(formatted)
    }
  }, [existingMessages])

  // Load medical context from APIs (only when token is available)
  const { data: allergiesRes } = useSWR<{ items: { id: string, name: string }[] }>(token ? "/api/allergies" : null, fetcherWithAuth)
  const { data: medicationsRes } = useSWR<{ items: { id: string, name: string, dosage?: string | null, frequency?: string | null }[] }>(token ? "/api/medications" : null, fetcherWithAuth)
  const { data: conditionsRes } = useSWR<{ items: { id: string, name: string, severity?: string | null }[] }>(token ? "/api/conditions" : null, fetcherWithAuth)

  const context = {
    allergies: (allergiesRes?.items ?? []).map(a => a.name),
    medications: (medicationsRes?.items ?? []).map(m => [m.name, m.dosage, m.frequency].filter(Boolean).join(" ")),
    conditions: (conditionsRes?.items ?? []).map(c => [c.name, c.severity].filter(Boolean).join(" ")),
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const userMessage = {
      id: messages.length + 1,
      role: "user" as const,
      content: inputValue,
      timestamp: new Date(),
    }

    // Placeholder assistant message for streaming updates
    const aiPlaceholder = {
      id: userMessage.id + 1,
      role: "assistant" as const,
      content: "",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage, aiPlaceholder])
    setInputValue("")
    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`

      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          messages: messages
            .map((m) => ({ role: m.role, content: m.content }))
            .concat({ role: "user", content: userMessage.content }),
          context,
          consultation_id: consultationId ?? undefined,
          stream: true,
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        let errMsg = "Failed to get AI response"
        try {
          const json = JSON.parse(errText)
          errMsg = json.error ?? errMsg
        } catch {}
        throw new Error(errMsg)
      }

      const contentType = res.headers.get("content-type") || ""
      const isNdjson = contentType.includes("application/x-ndjson")

      if (isNdjson && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.trim()) continue
            let evt: any
            try { evt = JSON.parse(line) } catch { continue }

            if (evt.type === "delta" && typeof evt.delta === "string") {
              setMessages((prev) => prev.map((m) => (
                m.id === aiPlaceholder.id ? { ...m, content: (m.content || "") + evt.delta } : m
              )))
            } else if (evt.type === "final") {
              if (evt.consultation_id && typeof evt.consultation_id === "string") {
                setConsultationId(evt.consultation_id)
              }
              setIsLoading(false)
            } else if (evt.type === "error") {
              setError(evt.error || "Streaming failed")
              setIsLoading(false)
            }
          }
        }

        // Ensure loading state is cleared even if final wasn't received
        setIsLoading(false)
      } else {
        // Fallback to non-streaming JSON response
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to get AI response")
        }
        if (json.consultation_id && typeof json.consultation_id === "string") {
          setConsultationId(json.consultation_id)
        }
        setMessages((prev) => prev.map((m) => (
          m.id === aiPlaceholder.id ? { ...m, content: json.reply ?? "" } : m
        )))
        setIsLoading(false)
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[60vh]">
          {/* Chat Area */}
          <div className="lg:col-span-3 flex flex-col">
            {/* System Alert */}
            <Alert className="mb-4 border-destructive/30 bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-xs text-foreground ml-2">
                <strong>Important:</strong> AI can make mistakes. For medical emergencies or serious health concerns,
                contact emergency services immediately.
              </AlertDescription>
            </Alert>

            {/* Error Alert */}
            {error && (
              <Alert className="mb-4 border-destructive/30 bg-destructive/5">
                <AlertDescription className="text-xs text-destructive ml-2">{error}</AlertDescription>
              </Alert>
            )}

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 mb-4 pr-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="w-8 h-8 shrink-0 bg-primary">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">MD</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none border border-border"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="w-8 h-8 shrink-0 bg-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">MD</AvatarFallback>
                    </Avatar>
                    <div className="px-4 py-3 rounded-lg bg-muted text-foreground border border-border rounded-bl-none">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-100" />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Button type="button" variant="outline" size="icon" className="shrink-0 bg-transparent">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                placeholder="Type your message or symptoms..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 shrink-0 gap-2"
                disabled={isLoading || !inputValue.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Medical Context Sidebar */}
          <Card className="bg-card h-fit lg:sticky lg:top-24">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-foreground mb-4">Medical Context</h3>

              <div className="space-y-4">
                {/* Allergies */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Allergies</p>
                  <div className="flex flex-wrap gap-2">
                    {context.allergies && context.allergies.length > 0 ? (
                      context.allergies.map((allergy) => (
                        <span key={allergy} className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full">
                          {allergy}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None added yet</span>
                    )}
                  </div>
                </div>

                {/* Medications */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Medications</p>
                  {context.medications && context.medications.length > 0 ? (
                    <ul className="text-xs space-y-1 text-foreground">
                      {context.medications.map((med) => (
                        <li key={med} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{med}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-muted-foreground">None added yet</span>
                  )}
                </div>

                {/* Conditions */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Conditions</p>
                  {context.conditions && context.conditions.length > 0 ? (
                    <ul className="text-xs space-y-1 text-foreground">
                      {context.conditions.map((condition) => (
                        <li key={condition} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{condition}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-muted-foreground">None added yet</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}