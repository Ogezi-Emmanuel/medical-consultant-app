"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function AuthSignInRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/sign-in")
  }, [router])
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redirecting to Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            If you are not redirected automatically, go to <Link className="underline" href="/sign-in">Sign In</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}