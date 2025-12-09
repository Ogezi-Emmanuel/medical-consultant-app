import { type UseChatHelpers } from "ai/react"
import * as React from "react"

export function useEnterSubmit() {
  const formRef = React.useRef<HTMLFormElement>(null)

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        formRef.current?.requestSubmit()
        e.preventDefault()
      }
    },
    []
  )

  return { formRef, onKeyDown }
}