import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const BUCKET = 'project-images'

export async function POST(req: Request) {
  try {
    const sb = getSupabase()
    const { base64, filename } = await req.json()
    if (!base64 || !filename) {
      return NextResponse.json({ error: 'base64 and filename required' }, { status: 400 })
    }

    const content = base64.includes(',') ? base64.split(',')[1] : base64
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    const safeName = `tagett-${Date.now()}.${ext}`

    const buffer = Buffer.from(content, 'base64')
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    }
    const contentType = mimeMap[ext] ?? 'application/octet-stream'

    const { error } = await sb.storage
      .from(BUCKET)
      .upload(safeName, buffer, { contentType, upsert: false })

    if (error) throw error

    const { data } = sb.storage.from(BUCKET).getPublicUrl(safeName)
    return NextResponse.json({ path: data.publicUrl })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
