"use client"

import { type Message } from "ai"
import { useCompletion } from "ai/react"

import { Button } from "@/components/ui/button"
import { IconCheck, IconCopy, IconRefresh } from "@/components/ui/icons"
import { UseCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { toast } from "sonner"

interface ChatMessageActionsProps {
  message: Message
}

export function ChatMessageActions({ message }: ChatMessageActionsProps) {
  const { isCopied, copyToClipboard } = UseCopyToClipboard({ timeout: 2000 })

  const onCopy = () => {
    if (isCopied) return
    copyToClipboard(message.content)
  }

  const { complete, isLoading } = useCompletion({
    api: "/api/consultations",
    onFinish: (prompt, completion) => {
      toast.success("Consultation regenerated successfully.")
    },
  })

  const onRegenerate = () => {
    complete(message.content)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {message.role === "assistant" && (
        <Button variant="ghost" size="icon" onClick={onRegenerate} disabled={isLoading}>
          <IconRefresh className={isLoading ? "animate-spin" : ""} />
          <span className="sr-only">Regenerate</span>
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={onCopy}>
        {isCopied ? <IconCheck /> : <IconCopy />}
        <span className="sr-only">Copy message</span>
      </Button>
    </div>
  )
}