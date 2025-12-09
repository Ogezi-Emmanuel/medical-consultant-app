"use client"

import * as React from "react"
import Textarea from "react-textarea-autosize"

import { UseChatHelpers } from "ai/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { IconArrowElbow, IconPlus, IconX } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useEnterSubmit } from "@/hooks/use-enter-submit"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface ChatPanelProps
  extends Pick<
    UseChatHelpers,
    | "append"
    | "isLoading"
    | "reload"
    | "messages"
    | "stop"
    | "input"
    | "setInput"
  > {
  id?: string
}

export function ChatPanel({ id, isLoading, stop, append, reload, input, setInput }: ChatPanelProps) {
  const { formRef, onKeyDown } = useEnterSubmit()
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <div className="fixed inset-x-0 bottom-0 w-full bg-linear-to-b from-muted/30 from-0% to-muted/30 to-50% duration-300 ease-in-out animate-in dark:from-background/10 dark:from-10% dark:to-background/80 peer-data-[state=open]:group-data-[state=open]:lg:pl-[250px] peer-data-[state=open]:group-data-[state=open]:xl:pl-[300px]">
      <div className="mx-auto sm:max-w-2xl sm:px-4">
        <div className="space-y-4 border-t bg-background px-4 py-2 shadow-lg sm:rounded-t-xl sm:border md:py-4">
          <form
            ref={formRef}
            onSubmit={async (e) => {
              e.preventDefault()
              if (!input.trim()) {
                return
              }
              setInput("")
              await append({ content: input, role: "user" })
            }}
          >
            <div className="relative flex max-h-60 w-full grow overflow-hidden bg-background pr-8 sm:rounded-md sm:border">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/"
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                        "absolute left-0 top-4 h-8 w-8 rounded-full bg-background p-0 sm:left-4"
                      )}
                    >
                      <IconPlus />
                      <span className="sr-only">New Chat</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>New Chat</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Textarea
                ref={inputRef}
                tabIndex={0}
                onKeyDown={onKeyDown}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Send a message."
                spellCheck={false}
                className="min-h-[60px] w-full resize-none bg-transparent px-16 py-[1.3rem] focus-within:outline-none sm:text-sm"
              />
              <div className="absolute right-0 top-4 sm:right-4">
                {isLoading ? (
                  <Button variant="outline" size="icon" onClick={() => stop()}>
                    <IconX className="h-4 w-4" />
                    <span className="sr-only">Stop generating</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    type="submit"
                    disabled={input.length === 0}
                  >
                    <IconArrowElbow />
                    <span className="sr-only">Send message</span>
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}