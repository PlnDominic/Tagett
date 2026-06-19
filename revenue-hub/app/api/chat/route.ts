import { NextRequest, NextResponse } from 'next/server'

const MODEL = 'llama-3.3-70b-versatile'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  systemPrompt: string
  messages: Message[]
}

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

  const { systemPrompt, messages } = body
  if (!systemPrompt || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missing systemPrompt or messages' }, { status: 400 })
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  })

  if (!groqRes.ok) {
    const err = await groqRes.json().catch(() => ({}))
    const message =
      (err as { error?: { message?: string } })?.error?.message ??
      `Groq API error ${groqRes.status}`
    return NextResponse.json({ error: message }, { status: groqRes.status })
  }

  const data = await groqRes.json()
  const text: string = data.choices?.[0]?.message?.content ?? ''
  return NextResponse.json({ text })
}
