import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const agentId = process.env.ELEVENLABS_AGENT_ID
  const fromNumber = process.env.ELEVENLABS_FROM_NUMBER

  if (!apiKey || !agentId || !fromNumber) {
    return NextResponse.json(
      { error: 'ElevenLabs not configured. Set ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, ELEVENLABS_FROM_NUMBER.' },
      { status: 500 }
    )
  }

  let toNumber: string
  try {
    const body = await req.json()
    toNumber = body.toNumber
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!toNumber) {
    return NextResponse.json({ error: 'toNumber is required' }, { status: 400 })
  }

  const res = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound_call', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: agentId,
      to: toNumber,
      from: fromNumber,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const message =
      (err as { detail?: string; message?: string })?.detail ??
      (err as { detail?: string; message?: string })?.message ??
      `ElevenLabs error ${res.status}`
    return NextResponse.json({ error: message }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ success: true, callId: data?.call_sid ?? data?.id ?? null })
}
