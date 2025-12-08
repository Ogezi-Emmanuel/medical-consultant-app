"use client"

import type React from "react"

import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Activity, Brain, ShieldCheck, Stethoscope, Calendar, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import useSWR from "swr"
import { supabaseBrowser } from "@/lib/supabase"

export default function LandingPage() {
  // Real-time localized date/time
  const [now, setNow] = useState<Date>(new Date())
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const formattedDateTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(now)

  // Conditionally fetch and render consultation history (only if records exist)
  const fetcher = async (url: string) => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const headers: Record<string, string> = {}
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
    return fetch(url, { headers, credentials: "include" }).then((r) => r.json())
  }
  const { data: consultationsData } = useSWR<{ items: { id: string; topic: string; status: string; started_at: string; summary?: string }[] }>(
    "/api/consultations",
    fetcher
  )
  const consultations = consultationsData?.items ?? []

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Disclaimer Banner */}
        <Alert className="mb-8 border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-sm text-foreground">
            <strong>Medical Disclaimer:</strong> This AI-powered assistant is for informational purposes only and does not replace professional medical advice. For emergencies or serious concerns, contact local emergency services.
          </AlertDescription>
        </Alert>

        {/* Current Date & Time */}
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          <span suppressHydrationWarning>{isMounted ? formattedDateTime : ""}</span>
        </div>

        {/* Hero */}
        <section className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              AI-Powered Healthcare Companion
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Smarter medical guidance, beautifully simple
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Get personalized health insights, manage your medical profile, and chat with an intelligent assistant — all in one secure place.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/sign-up">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-transparent">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">AI Consultation</p>
                      <p className="text-sm text-muted-foreground">Describe symptoms and receive guidance instantly.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Personal Health Profile</p>
                      <p className="text-sm text-muted-foreground">Track allergies, medications, and conditions.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Privacy & Security</p>
                      <p className="text-sm text-muted-foreground">Modern authentication and protected data handling.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Fast, Responsive UI</p>
                      <p className="text-sm text-muted-foreground">Optimized for any device and screen size.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Value Proposition */}
        <section className="mt-16">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">Clarity over complexity</h3>
                <p className="mt-2 text-sm text-muted-foreground">Thoughtful design and contemporary typography make health information easy to read and act upon.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">Actionable insights</h3>
                <p className="mt-2 text-sm text-muted-foreground">Get practical guidance tailored to your profile and context, not generic answers.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">Built for trust</h3>
                <p className="mt-2 text-sm text-muted-foreground">Secure authentication and careful handling of your sensitive data come standard.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Recent Consultations (render only if records exist) */}
        {consultations.length > 0 && (
          <section className="mt-16">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Recent Consultations
                </CardTitle>
                <CardDescription>Your latest consultation sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {consultations.slice(0, 3).map((c) => (
                    <div key={c.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{c.topic}</h3>
                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{c.status}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {new Date(c.started_at).toLocaleString()}
                          </p>
                          {c.summary && <p className="text-sm text-foreground">{c.summary}</p>}
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/consultation?consultation_id=${c.id}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-16">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-8">
            <p className="text-sm text-muted-foreground">© 2025 Medical Consultant Bot. All rights reserved.</p>
            <div className="flex items-center gap-3 text-sm">
              <Link className="underline underline-offset-4 hover:text-primary" href="/about">About</Link>
              <Link className="underline underline-offset-4 hover:text-primary" href="/consultation">Try Consultation</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
