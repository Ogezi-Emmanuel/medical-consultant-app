"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

const ConsultationContent = dynamic(() => import("./consultation-content"), { ssr: false })

export default function ConsultationPage() {
  return (
    <Suspense fallback={<div>Loading consultation...</div>}>
      <ConsultationContent />
    </Suspense>
  )
}
