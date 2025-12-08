"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resentMessage, setResentMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResentMessage(null)
    setLoading(true)
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push("/dashboard")
    } catch (err: any) {
      const msg = err?.message ?? "Failed to sign in"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResentMessage(null)
    setResending(true)
    try {
      if (!email) throw new Error("Please enter your email above first.")
      const { error } = await supabaseBrowser.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/confirm` : undefined,
        },
      })
      if (error) throw error
      setResentMessage("Confirmation email resent. Please check your inbox and follow the link to verify your email.")
    } catch (err: any) {
      setResentMessage(err?.message ?? "Failed to resend confirmation email")
    } finally {
      setResending(false)
    }
  }

  const showResend = !!error && /confirm|verify|not\s*confirmed/i.test(error)

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {showResend && (
              <div className="grid gap-2">
                <p className="text-sm">Your email appears to be unverified. Please check your inbox for the confirmation email or resend it below.</p>
                <Button type="button" variant="secondary" onClick={handleResend} disabled={resending}>
                  {resending ? "Resending..." : "Resend confirmation email"}
                </Button>
                {resentMessage && <p className="text-xs text-muted-foreground">{resentMessage}</p>}
              </div>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            Don&apos;t have an account? <Link className="underline" href="/sign-up">Sign Up</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}