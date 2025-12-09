"use client"

import { Suspense } from "react"
import dynamicImport from "next/dynamic"

export const dynamic = "force-dynamic"

const ConsultationContent = dynamicImport(() => import("./consultation-content"), { ssr: false })

export default function ConsultationPage() {
  return (
    <Suspense fallback={<div>Loading consultation...</div>}>
      <ConsultationContent />
    </Suspense>
  )
}
