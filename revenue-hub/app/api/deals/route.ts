import { NextRequest, NextResponse } from 'next/server'

const KV_URL = process.env.UPSTASH_REDIS_REST_URL
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const KEY = 'tagett-deals-v2'

async function kvGet(key: string): Promise<string | null> {
  if (!KV_URL || !KV_TOKEN) return null
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: 'no-store',
  })
  const data = await res.json()
  return data.result ?? null
}

async function kvSet(key: string, value: string): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return
  await fetch(`${KV_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
}

export async function GET() {
  try {
    const raw = await kvGet(KEY)
    return NextResponse.json(raw ? JSON.parse(raw) : null)
  } catch {
    return NextResponse.json(null)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const deals = await req.json()
    await kvSet(KEY, JSON.stringify(deals))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
