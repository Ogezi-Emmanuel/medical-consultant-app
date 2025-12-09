"use client"

import * as React from "react"
import { useInView } from "react-intersection-observer"

interface ChatScrollAnchorProps {
  trackVisibility?: boolean
}

export function ChatScrollAnchor({ trackVisibility }: ChatScrollAnchorProps) {
  const { ref, inView } = useInView({
    trackVisibility,
    delay: 100,
    rootMargin: "0px 0px -150px 0px",
  })

  React.useEffect(() => {
    if (inView) {
      window.scrollTo({
        top: document.body.offsetHeight,
        behavior: "smooth",
      })
    }
  }, [inView])

  return <div ref={ref} className="h-px w-full" />
}