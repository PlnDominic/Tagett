import { NextRequest, NextResponse } from 'next/server'

const KV_URL = process.env.UPSTASH_REDIS_REST_URL
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const KV_KEY = 'push_subscription'

async function kvSet(value: string) {
  if (!KV_URL || !KV_TOKEN) throw new Error('Redis not configured')
  const res = await fetch(`${KV_URL}/set/${KV_KEY}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
  if (!res.ok) throw new Error('Redis write failed')
}

async function kvDel() {
  if (!KV_URL || !KV_TOKEN) throw new Error('Redis not configured')
  await fetch(`${KV_URL}/del/${KV_KEY}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  })
}

export async function POST(req: NextRequest) {
  if (!KV_URL || !KV_TOKEN) {
    return NextResponse.json(
      { error: 'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable push notifications.' },
      { status: 503 }
    )
  }
  try {
    const subscription = await req.json()
    await kvSet(JSON.stringify(subscription))
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE() {
  if (!KV_URL || !KV_TOKEN) return NextResponse.json({ success: true })
  try {
    await kvDel()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
