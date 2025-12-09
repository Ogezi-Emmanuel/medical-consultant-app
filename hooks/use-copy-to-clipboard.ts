import * as React from "react"

interface UseCopyToClipboardProps {
  timeout?: number
}

export function UseCopyToClipboard({ timeout = 2000 }: UseCopyToClipboardProps) {
  const [isCopied, setIsCopied] = React.useState(false)

  const copyToClipboard = React.useCallback((value: string) => {
    if (typeof window === "undefined" || !navigator.clipboard?.writeText) {
      return
    }

    if (isCopied) {
      return
    }

    navigator.clipboard.writeText(value)
    setIsCopied(true)

    setTimeout(() => {
      setIsCopied(false)
    }, timeout)
  }, [isCopied, timeout])

  return {
    isCopied,
    copyToClipboard,
  }
}