import { NextRequest, NextResponse } from 'next/server'
import { getAgentTools, executeTool, ToolDefinition } from '@/lib/tools'

const GROQ_MODEL   = 'llama-3.3-70b-versatile'
const GEMINI_MODEL = 'gemini-2.0-flash'
const MAX_TOOL_ITERATIONS = 5

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
  const body: Record<string, unknown> = { model, max_tokens: 2000, messages }
  if (tools.length > 0) body.tools = tools
  return fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function POST(req: NextRequest) {
  const groqKey   = process.env.GROQ_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (!groqKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
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

  // Use Gemini for tool-using agents (Scout, Prospect, etc.) when key is available
  const useGemini = tools.length > 0 && !!geminiKey
  const apiUrl = useGemini
    ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions'
  const apiKey = useGemini ? geminiKey! : groqKey
  const model  = useGemini ? GEMINI_MODEL : GROQ_MODEL

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
  ]

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const res = await callLLM(apiUrl, apiKey, model, chatMessages, tools)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const message =
        (err as { error?: { message?: string } })?.error?.message ??
        `API error ${res.status}`

      // Groq/llama occasionally produces malformed tool calls — retry without tools
      if (!useGemini && tools.length > 0 && message.includes('tool call validation failed')) {
        const fallback = await callLLM(apiUrl, apiKey, model, chatMessages, [])
        if (fallback.ok) {
          const fd = await fallback.json()
          return NextResponse.json({ text: (fd.choices?.[0]?.message?.content as string) ?? '' })
        }
      }

      return NextResponse.json({ error: message }, { status: res.status })
    }

    const data = await res.json()
    const choice = data.choices?.[0]
    const finishReason: string = choice?.finish_reason ?? 'stop'
    const msg = choice?.message

    if (finishReason !== 'tool_calls' || !msg?.tool_calls?.length) {
      return NextResponse.json({ text: (msg?.content as string) ?? '' })
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
