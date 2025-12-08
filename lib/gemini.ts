import { GoogleGenerativeAI } from "@google/generative-ai"

const DEFAULT_MODEL = "gemini-2.5-flash"
const DEFAULT_GENERATION_CONFIG = { temperature: 0.7, maxOutputTokens: 2048 }

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null
}

let verified = false
let lastError: string | null = null

export async function ensureVerified(): Promise<{ ok: boolean; error: string | null; model: string | null }> {
  const apiKey = getApiKey()
  if (!apiKey) {
    verified = false
    lastError = "Missing Google/Gemini API key"
    return { ok: false, error: lastError, model: null }
  }
  if (verified) return { ok: true, error: null, model: DEFAULT_MODEL }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL })
    await model.countTokens("health-check")
    verified = true
    lastError = null
    return { ok: true, error: null, model: DEFAULT_MODEL }
  } catch (e: any) {
    verified = false
    lastError = e?.message ?? "Verification failed"
    return { ok: false, error: lastError, model: DEFAULT_MODEL }
  }
}

export function getGeminiModel(options?: { model?: string; generationConfig?: any; safetySettings?: any }) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error("Missing Google/Gemini API key")

  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: options?.model ?? DEFAULT_MODEL,
    generationConfig: options?.generationConfig ?? DEFAULT_GENERATION_CONFIG,
    ...(options?.safetySettings ? { safetySettings: options.safetySettings } : {}),
  })
}

function mapGeminiError(err: any): string {
  const msg = err?.message ?? "Unknown error"
  const status = err?.status ?? err?.code ?? null
  if (status === 401 || status === 403) return "Unauthorized: invalid or missing API key"
  if (status === 429) return "Rate limit exceeded: please slow down"
  if (typeof status === "number" && status >= 500) return "Upstream model service error"
  return msg
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message = "Request timed out"): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)) as Promise<T>,
  ])
}

export async function generateText(
  prompt: string,
  options?: { model?: string; generationConfig?: any; safetySettings?: any; timeoutMs?: number }
): Promise<string> {
  try {
    const model = getGeminiModel(options)
    const result = await withTimeout(model.generateContent(prompt), options?.timeoutMs ?? 30000)
    return result.response.text()
  } catch (err: any) {
    throw new Error(mapGeminiError(err))
  }
}

export async function generateTextStream(
  prompt: string,
  options?: { model?: string; generationConfig?: any; safetySettings?: any }
): Promise<AsyncGenerator<string>> {
  const model = getGeminiModel(options)
  const result: any = await model.generateContentStream(prompt)
  async function* iterator() {
    let aggregated = ""
    for await (const chunk of result.stream) {
      try {
        const delta = typeof chunk?.text === "function" ? chunk.text() : (chunk?.candidates?.[0]?.content?.parts?.[0]?.text ?? "")
        if (delta) {
          aggregated += delta
          yield delta
        }
      } catch (e) {
        // ignore chunk parse errors to keep stream flowing
      }
    }
  }
  return iterator()
}