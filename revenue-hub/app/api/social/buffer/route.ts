import { NextRequest, NextResponse } from 'next/server'

const BUFFER_BASE = 'https://api.bufferapp.com/1'

function getToken() {
  return process.env.BUFFER_ACCESS_TOKEN
}

function notConfigured() {
  return NextResponse.json(
    { error: 'Set BUFFER_ACCESS_TOKEN in environment variables. Get it from buffer.com → Settings → Apps.' },
    { status: 503 }
  )
}

// GET — returns connected Buffer profiles so the UI knows which platforms are linked
export async function GET() {
  const token = getToken()
  if (!token) return notConfigured()

  const res = await fetch(`${BUFFER_BASE}/profiles.json`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message ?? 'Buffer error' }, { status: res.status })
  }
  const profiles = await res.json()
  return NextResponse.json(
    profiles.map((p: { id: string; service: string; service_username: string }) => ({
      id: p.id,
      service: p.service,
      username: p.service_username,
    }))
  )
}

// POST — schedule or immediately send a post to selected Buffer profiles
export async function POST(req: NextRequest) {
  const token = getToken()
  if (!token) return notConfigured()

  const { text, profileIds, now = true } = await req.json().catch(() => ({}))
  if (!text || !Array.isArray(profileIds) || profileIds.length === 0) {
    return NextResponse.json({ error: 'text and profileIds are required' }, { status: 400 })
  }

  const body = new URLSearchParams()
  body.append('text', text)
  for (const id of profileIds) body.append('profile_ids[]', id)
  if (now) body.append('now', 'true')

  const res = await fetch(`${BUFFER_BASE}/updates/create.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data.message ?? 'Buffer error' }, { status: res.status })
  }
  return NextResponse.json({ success: true })
}
