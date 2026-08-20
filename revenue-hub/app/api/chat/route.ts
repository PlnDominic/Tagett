import { NextRequest, NextResponse } from 'next/server'
import { getAgentTools, executeTool, ToolDefinition } from '@/lib/tools'
import { stripEmDashes } from '@/lib/text'

// Groq deprecated llama-3.3-70b-versatile for free/developer tiers in June 2026;
// it now answers every request with a 404 "model does not exist". gpt-oss-120b
// is the migration target Groq names for it.
const GROQ_MODEL    = 'openai/gpt-oss-120b'
const GEMINI_MODEL  = 'gemini-2.0-flash'
const MISTRAL_MODEL = 'mistral-small-latest'
const MAX_TOOL_ITERATIONS = 5

const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions'
const GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  systemPrompt: string
  messages: Message[]
  agentId?: string
}

interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type ChatMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | { role: 'assistant'; content: null; tool_calls: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

async function callLLM(
  url: string,
  authKey: string,
  model: string,
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<Response> {
  const body: Record<string, unknown> = { model, max_tokens: 2000, temperature: 0.3, messages }
  if (tools.length > 0) body.tools = tools
  return fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function POST(req: NextRequest) {
  const groqKey    = process.env.GROQ_API_KEY
  const geminiKey  = process.env.GEMINI_API_KEY
  const mistralKey = process.env.MISTRAL_API_KEY

  if (!groqKey && !geminiKey && !mistralKey) {
    return NextResponse.json({ error: 'No LLM provider configured (set GROQ_API_KEY, GEMINI_API_KEY or MISTRAL_API_KEY)' }, { status: 500 })
  }

  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { systemPrompt, messages, agentId } = body
  if (!systemPrompt || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missing systemPrompt or messages' }, { status: 400 })
  }

  const tools: ToolDefinition[] = agentId ? getAgentTools(agentId) : []

  const groq    = groqKey    ? { url: GROQ_URL,    key: groqKey,    model: GROQ_MODEL }    : null
  const gemini  = geminiKey  ? { url: GEMINI_URL,  key: geminiKey,  model: GEMINI_MODEL }  : null
  const mistral = mistralKey ? { url: MISTRAL_URL, key: mistralKey, model: MISTRAL_MODEL } : null

  // Tool-using agents lead with Mistral/Gemini (llama-family tool calls are the
  // least reliable); plain chat leads with Groq for latency. Every configured
  // provider is a fallback for the others regardless.
  //
  // The fallback used to trigger on 429 alone, which meant one provider going
  // permanently bad took every non-tool feature down with it — exactly what
  // happened when Groq retired the model this route hardcoded: the WhatsApp
  // draft button, and every plain-chat agent, returned a 404 with no fallback
  // even though Gemini and Mistral were configured and healthy. Any failure
  // now moves to the next provider.
  const chain = (tools.length > 0
    ? [mistral, gemini, groq]
    : [groq, mistral, gemini]
  ).filter((p): p is NonNullable<typeof p> => p !== null)

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
  ]

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    let res: Response | null = null
    let lastError = 'No LLM provider available'
    let lastStatus = 502

    for (const provider of chain) {
      const attempt = await callLLM(provider.url, provider.key, provider.model, chatMessages, tools)
      if (attempt.ok) { res = attempt; break }

      const err = await attempt.json().catch(() => ({}))
      lastError = (err as { error?: { message?: string } })?.error?.message ?? `API error ${attempt.status}`
      lastStatus = attempt.status

      // Malformed tool calls are a quirk of the model, not the provider —
      // retrying the same one without tools usually succeeds.
      if (tools.length > 0 && lastError.includes('tool call validation failed')) {
        const retry = await callLLM(provider.url, provider.key, provider.model, chatMessages, [])
        if (retry.ok) {
          const fd = await retry.json()
          return NextResponse.json({ text: stripEmDashes((fd.choices?.[0]?.message?.content as string) ?? '') })
        }
      }
    }

    if (!res) {
      console.error('[chat] all providers failed:', lastError)
      return NextResponse.json({ error: lastError }, { status: lastStatus })
    }

    const data = await res.json()
    const choice = data.choices?.[0]
    const finishReason: string = choice?.finish_reason ?? 'stop'
    const msg = choice?.message

    if (finishReason !== 'tool_calls' || !msg?.tool_calls?.length) {
      return NextResponse.json({ text: stripEmDashes((msg?.content as string) ?? '') })
    }

    chatMessages.push({ role: 'assistant', content: null, tool_calls: msg.tool_calls as ToolCall[] })

    for (const tc of msg.tool_calls as ToolCall[]) {
      let args: Record<string, string> = {}
      try { args = JSON.parse(tc.function.arguments) } catch { /* ignore */ }
      const result = await executeTool(tc.function.name, args)
      chatMessages.push({ role: 'tool', tool_call_id: tc.id, content: result })
    }
  }

  return NextResponse.json({ text: '' })
}
