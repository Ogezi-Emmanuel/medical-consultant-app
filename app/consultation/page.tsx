"use client"

import { Suspense } from "react"
import ConsultationContent from "./consultation-content"

export const dynamic = "force-dynamic"

export default function ConsultationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConsultationContent />
    </Suspense>
  )
}
