"use client"

import { FC } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { coldarkDark } from "react-syntax-highlighter/dist/cjs/styles/prism"

import { UseCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Button } from "@/components/ui/button"
import { IconCheck, IconCopy } from "@/components/ui/icons"

interface CodeBlockProps {
  language: string
  value: string
}

interface languageMap {
  [key: string]: string | undefined
}

export const programmingLanguages: languageMap = {
  javascript: ".js",
  python: ".py",
  go: ".go",
  typescript: ".ts",
  php: ".php",
  java: ".java",
  csharp: ".cs",
  cpp: ".cpp",
  kotlin: ".kt",
  ruby: ".rb",
  swift: ".swift",
  json: ".json",
  yaml: ".yaml",
  xml: ".xml",
  html: ".html",
  css: ".css",
  sql: ".sql",
  bash: ".sh",
  shell: ".sh",
  markdown: ".md",
  text: ".txt",
}

export const generateRandomString = (length: number, lowercase = false) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return lowercase ? result.toLowerCase() : result
}

export const CodeBlock: FC<CodeBlockProps> = ({ language, value }) => {
  const { isCopied, copyToClipboard } = UseCopyToClipboard({ timeout: 2000 })

  const onCopy = () => {
    if (isCopied) return
    copyToClipboard(value)
  }

  return (
    <div className="relative w-full font-sans codeblock bg-zinc-950">
      <div className="flex items-center justify-between px-4 text-xs h-9">
        <span className="text-white">{
          // @ts-ignore
          programmingLanguages[language] || language
        }</span>
        <Button
          variant="ghost"
          size="icon"
          className="text-xs hover:bg-zinc-700 focus-visible:ring-1 focus-visible:ring-slate-700 focus-visible:ring-offset-0"
          onClick={onCopy}
        >
          {isCopied ? <IconCheck /> : <IconCopy />}
          <span className="sr-only">Copy code</span>
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={coldarkDark}
        PreTag="div"
        showLineNumbers
        customStyle={{
          margin: 0,
          width: "100%",
          background: "transparent",
          padding: "1.5rem 1rem",
        }}
        codeTagProps={{
          className: "font-sans text-xs",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}