import { NextRequest, NextResponse } from 'next/server'
import { getAgentTools, executeTool, ToolDefinition } from '@/lib/tools'

const MODEL = 'llama-3.3-70b-versatile'
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

interface GroqToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type GroqMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | { role: 'assistant'; content: null; tool_calls: GroqToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
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

  const groqMessages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content } as GroqMessage)),
  ]

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const reqBody: Record<string, unknown> = {
      model: MODEL,
      max_tokens: 2000,
      messages: groqMessages,
    }
    if (tools.length > 0) reqBody.tools = tools

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    })

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}))
      const message =
        (err as { error?: { message?: string } })?.error?.message ??
        `Groq API error ${groqRes.status}`

      // llama occasionally produces malformed tool calls (name contains args);
      // retry once without tools so the model falls back to plain text.
      if (tools.length > 0 && message.includes('tool call validation failed')) {
        const fallbackRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: groqMessages }),
        })
        if (fallbackRes.ok) {
          const fd = await fallbackRes.json()
          return NextResponse.json({ text: (fd.choices?.[0]?.message?.content as string) ?? '' })
        }
      }

      return NextResponse.json({ error: message }, { status: groqRes.status })
    }

    const data = await groqRes.json()
    const choice = data.choices?.[0]
    const finishReason: string = choice?.finish_reason ?? 'stop'
    const msg = choice?.message

    if (finishReason !== 'tool_calls' || !msg?.tool_calls?.length) {
      return NextResponse.json({ text: (msg?.content as string) ?? '' })
    }

    // Append assistant message with tool_calls, then execute each
    groqMessages.push({ role: 'assistant', content: null, tool_calls: msg.tool_calls as GroqToolCall[] })

    for (const tc of msg.tool_calls as GroqToolCall[]) {
      let args: Record<string, string> = {}
      try { args = JSON.parse(tc.function.arguments) } catch { /* ignore */ }
      const result = await executeTool(tc.function.name, args)
      groqMessages.push({ role: 'tool', tool_call_id: tc.id, content: result })
    }
  }

  return NextResponse.json({ text: '' })
}
