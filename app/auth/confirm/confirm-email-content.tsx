"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase"

export default function ConfirmEmailContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<"idle"|"success"|"error">("idle")
  const [message, setMessage] = useState<string>("Verifying your email...")
  const [resending, setResending] = useState(false)

  useEffect(() => {
    async function verify() {
      const token_hash = params.get("token_hash") || params.get("token") || undefined
      const typeParam = params.get("type") || "signup"
      try {
        if (token_hash) {
          const { data: { session }, error } = await supabaseBrowser.auth.verifyOtp({
            token_hash,
            type: typeParam as any,
          })
          if (error) throw error
          setStatus("success")
          setMessage("Your email has been verified successfully. You are now signed in.")
          setTimeout(() => router.push("/dashboard"), 1500)
          return
        }
        // Fallback: rely on detectSessionInUrl and check current user
        const { data: { user }, error } = await supabaseBrowser.auth.getUser()
        if (error) throw error
        if (user) {
          setStatus("success")
          setMessage("Your email has been verified successfully. You are now signed in.")
          setTimeout(() => router.push("/dashboard"), 1500)
        } else {
          throw new Error("Invalid verification link.")
        }
      } catch (err: any) {
        setStatus("error")
        setMessage(err?.message ?? "Verification failed. The link may be expired or invalid.")
      }
    }
    verify()
  }, [params, router])

  async function handleResend() {
    setResending(true)
    try {
      const email = params.get("email") ?? ""
      if (!email) throw new Error("Missing email. Please return to sign in and use the resend option.")
      const { error } = await supabaseBrowser.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/confirm` : undefined,
        },
      })
      if (error) throw error
      setMessage("A new confirmation email has been sent.")
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to resend confirmation email")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <p className={status === "error" ? "text-destructive" : "text-foreground"}>{message}</p>
            {status === "error" && (
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">If your link expired, you can request a new one.</p>
                <Button type="button" variant="secondary" onClick={handleResend} disabled={resending}>
                  {resending ? "Resending..." : "Resend confirmation email"}
                </Button>
                <p className="text-sm">Or go back to <Link className="underline" href="/sign-in">Sign In</Link>.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}