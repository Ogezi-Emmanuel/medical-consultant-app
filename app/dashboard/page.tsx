"use client"

import { Plus, Calendar, AlertTriangle } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import useSWR from "swr"
import { supabaseBrowser } from "@/lib/supabase"
import { useEffect, useState } from "react"
const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(1, "Age is required")
  ),
  allergies: z.string().min(1, "Allergy information is required"),
})

// Remove mockConsultations and switch to real data via API
export default function DashboardPage() {
  // Add SWR fetchers for dynamic profile and allergies data
  const fetcher = async (url: string) => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const headers: Record<string, string> = {}
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
    return fetch(url, { headers, credentials: "include" }).then((r) => r.json())
  }
  // Track auth token to avoid premature requests without Authorization header
  const [token, setToken] = useState<string | null>(null)
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
  const { data: profileData } = useSWR<{ profile: { age?: number; gender?: string; blood_type?: string } | null }>(token ? "/api/profile" : null, fetcher)
  const { data: allergiesData } = useSWR<{ items: any[] }>(token ? "/api/allergies" : null, fetcher)
  const { data: consultationsData } = useSWR<{ items: { id: string; topic: string; status: string; started_at: string; summary: string | null }[] }>(token ? "/api/consultations" : null, fetcher)

  // Helper to format last consultation date
  const lastConsultDate = consultationsData?.items?.[0]?.started_at
    ? new Date(consultationsData.items[0].started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "—"

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="w-12 h-12 bg-primary">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">AD</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Welcome to your dashboard</h1>
              <p className="text-muted-foreground">Overview of your health profile and consultations</p>
            </div>
          </div>
        </div>

        {/* Remove Profile Form card entirely */}
        {/* (Card with Complete Your Profile has been removed as requested) */}

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary mb-1">{profileData?.profile?.age ?? "—"}</p>
                <p className="text-sm text-muted-foreground">Age</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="text-center flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-4xl font-bold text-destructive mb-1">{(allergiesData?.items?.length ?? 0)}</p>
                  <p className="text-sm text-muted-foreground">Allergies</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-lg font-semibold text-primary mb-1">{lastConsultDate}</p>
                <p className="text-sm text-muted-foreground">Last Consult</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Primary Action */}
        <div className="mb-8">
          <Link href="/consultation">
            <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2 w-full md:w-auto">
              <Plus className="w-5 h-5" />
              Start New Consultation
            </Button>
          </Link>
        </div>

        {/* Consultation History */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Consultation History
            </CardTitle>
            <CardDescription>Your past medical consultations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consultationsData?.items && consultationsData.items.length > 0 ? (
                consultationsData.items.map((consultation) => (
                  <div key={consultation.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{consultation.topic}</h3>
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {consultation.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{new Date(consultation.started_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
                        <p className="text-sm text-foreground">{consultation.summary ?? ""}</p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/consultation?consultation_id=${consultation.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No consultations yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
