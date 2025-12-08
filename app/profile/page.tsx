"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { supabaseBrowser } from "@/lib/supabase"

const fetcher = async (url: string) => {
  const { data: { session } } = await supabaseBrowser.auth.getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
  return fetch(url, { headers, credentials: "include" }).then((r) => r.json())
}

export default function ProfilePage() {
  // Delay initial SWR fetches until we have a token to avoid 401s on first render
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

  const { data, isLoading, error, mutate } = useSWR<{ profile: any; error?: string }>(token ? "/api/profile" : null, fetcher)
  // Fetch allergies, medications, conditions
  const { data: allergiesData, isLoading: allergiesLoading, error: allergiesError, mutate: mutateAllergies } = useSWR<{ items: any[]; error?: string }>(token ? "/api/allergies" : null, fetcher)
  const { data: medicationsData, isLoading: medicationsLoading, error: medicationsError, mutate: mutateMedications } = useSWR<{ items: any[]; error?: string }>(token ? "/api/medications" : null, fetcher)
  const { data: conditionsData, isLoading: conditionsLoading, error: conditionsError, mutate: mutateConditions } = useSWR<{ items: any[]; error?: string }>(token ? "/api/conditions" : null, fetcher)

  const initial = useMemo(() => {
    const p = data?.profile
    return {
      age: p?.age ? String(p.age) : "",
      gender: p?.gender ? capitalize(p.gender) : "Other",
      bloodType: p?.blood_type ?? "O+",
    }
  }, [data])

  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState(initial)
  const [newAllergy, setNewAllergy] = useState("")
  const [newMedication, setNewMedication] = useState("")
  const [newCondition, setNewCondition] = useState("")
  const busy = isLoading || allergiesLoading || medicationsLoading || conditionsLoading

  useEffect(() => {
    setFormData(initial)
  }, [initial])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(false)

    const payload = {
      age: formData.age ? Number(formData.age) : undefined,
      gender: normalizeGender(formData.gender),
      blood_type: formData.bloodType as any,
    }

    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
      credentials: "include",
    })

    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? "Failed to save profile")
      return
    }
    setSaved(true)
    mutate()
    setTimeout(() => setSaved(false), 3000)
  }

  const addAllergy = async () => {
    const name = newAllergy.trim()
    if (!name) return
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
    const res = await fetch("/api/allergies", {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
      credentials: "include",
    })
    const json = await res.json()
    if (!res.ok) return toast.error(json.error ?? "Failed to add allergy")
    toast.success("Allergy added")
    setNewAllergy("")
    mutateAllergies()
  }

  const removeAllergy = async (id: string) => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
    const res = await fetch("/api/allergies", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ id }),
      credentials: "include",
    })
    const json = await res.json()
    if (!res.ok) return toast.error(json.error ?? "Failed to remove allergy")
    toast.success("Allergy removed")
    mutateAllergies()
  }

  const addMedication = async () => {
    const value = newMedication.trim()
    if (!value) return
    const name = value.split(",")[0]
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
    const res = await fetch("/api/medications", {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
      credentials: "include",
    })
    const json = await res.json()
    if (!res.ok) return toast.error(json.error ?? "Failed to add medication")
    toast.success("Medication added")
    setNewMedication("")
    mutateMedications()
  }

  const removeMedication = async (id: string) => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
    const res = await fetch("/api/medications", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ id }),
      credentials: "include",
    })
    const json = await res.json()
    if (!res.ok) return toast.error(json.error ?? "Failed to remove medication")
    toast.success("Medication removed")
    mutateMedications()
  }

  const addCondition = async () => {
    const name = newCondition.trim()
    if (!name) return
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
    const res = await fetch("/api/conditions", {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
      credentials: "include",
    })
    const json = await res.json()
    if (!res.ok) return toast.error(json.error ?? "Failed to add condition")
    toast.success("Condition added")
    setNewCondition("")
    mutateConditions()
  }

  const removeCondition = async (id: string) => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
    const res = await fetch("/api/conditions", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ id }),
      credentials: "include",
    })
    const json = await res.json()
    if (!res.ok) return toast.error(json.error ?? "Failed to remove condition")
    toast.success("Condition removed")
    mutateConditions()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Health Profile</h1>
          <p className="text-muted-foreground">Manage your personal health information</p>
        </div>

        {saved && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200 ml-2">
              Your profile has been saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-destructive/30 bg-destructive/5">
            <AlertDescription>Error loading profile</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal health demographics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="border-input bg-transparent rounded-md p-2"
                    disabled={isLoading}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodType">Blood Type</Label>
                  <select
                    id="bloodType"
                    value={formData.bloodType}
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                    className="border-input bg-transparent rounded-md p-2"
                    disabled={isLoading}
                  >
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Allergies */}
          <Card>
            <CardHeader>
              <CardTitle>Allergies</CardTitle>
              <CardDescription>List any allergies you have</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allergiesError && (
                <Alert className="border-destructive/30 bg-destructive/5">
                  <AlertDescription>{typeof allergiesError === "string" ? allergiesError : "Failed to load allergies"}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                {allergiesData?.items?.map((allergy) => (
                  <div key={allergy.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{allergy.name}</p>
                      {allergy.note && <p className="text-sm text-muted-foreground">{allergy.note}</p>}
                    </div>
                    <button type="button" onClick={() => removeAllergy(allergy.id)} className="hover:opacity-70">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add allergy (e.g., Peanuts)"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
                  disabled={busy}
                />
                <Button type="button" onClick={addAllergy} variant="outline" className="gap-2 bg-transparent" disabled={busy}>
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Medications */}
          <Card>
            <CardHeader>
              <CardTitle>Medications</CardTitle>
              <CardDescription>Track your current medications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {medicationsError && (
                <Alert className="border-destructive/30 bg-destructive/5">
                  <AlertDescription>{typeof medicationsError === "string" ? medicationsError : "Failed to load medications"}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                {medicationsData?.items?.map((med) => (
                  <div key={med.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{med.name}</p>
                      {(med.dosage || med.frequency) && (
                        <p className="text-sm text-muted-foreground">
                          {[med.dosage, med.frequency].filter(Boolean).join(" • ")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedication(med.id)}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add medication (e.g., Aspirin 500mg daily)"
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMedication())}
                  disabled={busy}
                />
                <Button type="button" onClick={addMedication} variant="outline" className="gap-2 bg-transparent" disabled={busy}>
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
              <CardDescription>Existing medical conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {conditionsError && (
                <Alert className="border-destructive/30 bg-destructive/5">
                  <AlertDescription>{typeof conditionsError === "string" ? conditionsError : "Failed to load conditions"}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                {conditionsData?.items?.map((cond) => (
                  <div key={cond.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{cond.name}</p>
                      {cond.severity && <p className="text-sm text-muted-foreground">Severity: {cond.severity}</p>}
                    </div>
                    <button type="button" onClick={() => removeCondition(cond.id)} className="hover:opacity-70">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add condition (e.g., Hypertension)"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCondition())}
                  disabled={busy}
                />
                <Button type="button" onClick={addCondition} variant="outline" className="gap-2 bg-transparent" disabled={busy}>
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={busy}>
              {busy ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}

function normalizeGender(g: string): "male" | "female" | "other" {
  const s = g.toLowerCase()
  if (s.startsWith("m")) return "male"
  if (s.startsWith("f")) return "female"
  return "other"
}

function capitalize(s?: string | null) {
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

async function addAllergy() {
  const input = document.querySelector<HTMLInputElement>("input[placeholder='Add allergy (e.g., Peanuts)']")
  const name = input?.value?.trim()
  if (!name) return
  const res = await fetch("/api/allergies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    credentials: "include",
  })
  const json = await res.json()
  if (!res.ok) return toast.error(json.error ?? "Failed to add allergy")
  toast.success("Allergy added")
  input!.value = ""
  const ev = new Event("allergy:added")
  window.dispatchEvent(ev)
}

async function removeAllergy(id: string) {
  const res = await fetch("/api/allergies", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
    credentials: "include",
  })
  const json = await res.json()
  if (!res.ok) return toast.error(json.error ?? "Failed to remove allergy")
  toast.success("Allergy removed")
  const ev = new Event("allergy:removed")
  window.dispatchEvent(ev)
}

async function addMedication() {
  const input = document.querySelector<HTMLInputElement>("input[placeholder='Add medication (e.g., Aspirin 500mg daily)']")
  const val = input?.value?.trim()
  if (!val) return
  // Simple parse: name before first comma
  const name = val.split(",")[0]
  const res = await fetch("/api/medications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    credentials: "include",
  })
  const json = await res.json()
  if (!res.ok) return toast.error(json.error ?? "Failed to add medication")
  toast.success("Medication added")
  input!.value = ""
  const ev = new Event("medication:added")
  window.dispatchEvent(ev)
}

async function removeMedication(id: string) {
  const res = await fetch("/api/medications", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
    credentials: "include",
  })
  const json = await res.json()
  if (!res.ok) return toast.error(json.error ?? "Failed to remove medication")
  toast.success("Medication removed")
  const ev = new Event("medication:removed")
  window.dispatchEvent(ev)
}

async function addCondition() {
  const input = document.querySelector<HTMLInputElement>("input[placeholder='Add condition (e.g., Hypertension)']")
  const name = input?.value?.trim()
  if (!name) return
  const res = await fetch("/api/conditions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    credentials: "include",
  })
  const json = await res.json()
  if (!res.ok) return toast.error(json.error ?? "Failed to add condition")
  toast.success("Condition added")
  input!.value = ""
  const ev = new Event("condition:added")
  window.dispatchEvent(ev)
}

async function removeCondition(id: string) {
  const res = await fetch("/api/conditions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
    credentials: "include",
  })
  const json = await res.json()
  if (!res.ok) return toast.error(json.error ?? "Failed to remove condition")
  toast.success("Condition removed")
  const ev = new Event("condition:removed")
  window.dispatchEvent(ev)
}
