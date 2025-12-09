"use client"

import { Suspense } from "react"
import ConfirmEmailContent from "./confirm-email-content"

export const dynamic = "force-dynamic"

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmEmailContent />
    </Suspense>
  )
}