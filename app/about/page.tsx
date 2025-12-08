"use client"

import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Brain, ShieldCheck, Stethoscope } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            About Medical Consultant Bot
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-foreground">Purpose, Features, and Value</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            A concise overview of our mission, what the app does, and how it benefits users.
          </p>
        </header>

        {/* Mission */}
        <section className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">Our Mission</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Empower individuals with accessible, trustworthy health guidance. We blend modern AI with thoughtful design to make health information easier to understand and act upon.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">Core Functionality</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Chat with an AI medical assistant, manage a personal health profile (allergies, medications, conditions), and keep your data secure with modern authentication.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">Value to Users</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Faster answers, clearer guidance, and a unified place to keep key health information — all with a responsive UI and a professional, consistent brand.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Differentiators */}
        <section className="mt-10">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="bg-muted/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Human-centered design</p>
                    <p className="text-sm text-muted-foreground">Contemporary typography and clean layouts keep important details front and center.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Context-aware assistance</p>
                    <p className="text-sm text-muted-foreground">Guidance adapts to your profile, not just generic answers from a model.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Security-first approach</p>
                    <p className="text-sm text-muted-foreground">Authentication best practices and careful handling of sensitive data.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Performance & Responsiveness</p>
                    <p className="text-sm text-muted-foreground">Optimized UX across devices, ensuring speed and reliability.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12 text-center">
          <h3 className="text-xl font-semibold">Ready to experience modern medical guidance?</h3>
          <p className="mt-2 text-sm text-muted-foreground">Create an account in seconds and start exploring your personalized health hub.</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-transparent">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </section>

        <footer className="mt-16 border-t border-border pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">© 2025 Medical Consultant Bot. All rights reserved.</p>
            <div className="flex items-center gap-3 text-sm">
              <Link className="underline underline-offset-4 hover:text-primary" href="/consultation">Try Consultation</Link>
              <Link className="underline underline-offset-4 hover:text-primary" href="/">Home</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}