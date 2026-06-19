import { NextRequest, NextResponse } from 'next/server'

const MODEL = 'claude-sonnet-4-6'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  systemPrompt: string
  messages: Message[]
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { systemPrompt, messages } = body
  if (!systemPrompt || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missing systemPrompt or messages' }, { status: 400 })
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}))
    const message = (err as { error?: { message?: string } })?.error?.message ?? `Anthropic error ${anthropicRes.status}`
    return NextResponse.json({ error: message }, { status: anthropicRes.status })
  }

  const data = await anthropicRes.json()
  const text: string = data.content[0].text
  return NextResponse.json({ text })
}
