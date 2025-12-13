"use client";

import { useChat } from "ai/react";
import { useCompletion } from "ai/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { ChatScrollAnchor } from "@/components/chat-scroll-anchor";
import { ChatList } from "@/components/chat-list";
import { ChatPanel } from "@/components/chat-panel";
import { EmptyScreen } from "@/components/empty-screen";

interface ConsultationContentProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export function ConsultationContent({ searchParams }: ConsultationContentProps) {
  const { user } = useUser();

  const { messages, append, reload, stop, isLoading, input, setInput } = useChat({
    api: "/api/chat",
    id: (Array.isArray(searchParams.id) ? searchParams.id[0] : searchParams.id) ?? "",
    body: {
      id: (Array.isArray(searchParams.id) ? searchParams.id[0] : searchParams.id) ?? "",
      stream: true,
    },
    async onResponse(response: Response) {
      if (!response.ok) {
        const resClone = response.clone();
        try {
          const data = await resClone.json();
          if (data?.error) {
            toast.error(data.error);
          } else {
            toast.error(`${response.status} ${response.statusText}`);
          }
        } catch {
          toast.error(`${response.status} ${response.statusText}`);
        }
      }
    },
    onError(error: unknown) {
      const msg = (error as any)?.message ?? "Chat request failed";
      toast.error(msg);
    },
  });

  const { complete, isLoading: isLoadingCompletion } = useCompletion({
    api: "/api/consultations",
    onFinish: (prompt: string, completion: string) => {
      append({
        content: completion,
        role: "assistant",
      });
    },
    onError(error: unknown) {
      const msg = (error as any)?.message ?? "Completion request failed";
      toast.error(msg);
    },
  });

  return (
    <div className={cn("group w-full overflow-auto pl-0 peer-data-[state=open]:lg:pl-[250px] peer-data-[state=open]:xl:pl-[300px]")}> 
      <div className="pb-[200px] pt-4 md:pt-10">
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen
            onPromptSelect={(prompt) => {
              complete(prompt, {
                body: {
                  id: (Array.isArray(searchParams.id) ? searchParams.id[0] : searchParams.id) ?? "",
                },
              });
            }}
          />
        )}
      </div>
      <ChatPanel
        id={(Array.isArray(searchParams.id) ? searchParams.id[0] : searchParams.id) ?? ""}
        isLoading={isLoading}
        stop={stop}
        append={append}
        reload={reload}
        input={input}
        setInput={setInput}
        messages={messages}
      />
    </div>
  );
}