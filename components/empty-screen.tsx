import { ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { IconArrowRight } from "@/components/ui/icons"

const exampleMessages = [
  {
    heading: "Describe a medical condition",
    message: "What are the symptoms and causes of diabetes?",
  },
  {
    heading: "Explain a medical procedure",
    message: "How is a colonoscopy performed and what are the risks?",
  },
  {
    heading: "Compare treatment options",
    message: "What are the pros and cons of chemotherapy versus radiation therapy for cancer?",
  },
  {
    heading: "Provide drug information",
    message: "What are the side effects and interactions of ibuprofen?",
  },
]

interface EmptyScreenProps {
  onPromptSelect: (prompt: string) => void
}

export function EmptyScreen({ onPromptSelect }: EmptyScreenProps) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-1 text-lg font-semibold">Welcome to Medical Consultant AI!</h1>
        <p className="leading-normal text-muted-foreground">
          I am an AI-powered medical assistant designed to provide information and answer your health-related questions.
          Please remember that I am not a substitute for professional medical advice.
        </p>
        <p className="leading-normal text-muted-foreground">
          You can start a conversation by typing a message or trying one of the following examples:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() => onPromptSelect(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}