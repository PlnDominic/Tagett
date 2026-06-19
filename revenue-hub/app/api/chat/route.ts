import { NextRequest, NextResponse } from 'next/server'

const MODEL = 'gemini-2.0-flash'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  systemPrompt: string
  messages: Message[]
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
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

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          maxOutputTokens: 1000,
        },
      }),
    }
  )

  if (!geminiRes.ok) {
    const err = await geminiRes.json().catch(() => ({}))
    const message =
      (err as { error?: { message?: string } })?.error?.message ??
      `Gemini API error ${geminiRes.status}`
    return NextResponse.json({ error: message }, { status: geminiRes.status })
  }

  const data = await geminiRes.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return NextResponse.json({ text })
}
