import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { compressImage } from '@/lib/image'

const BUCKET = 'project-images'

export async function POST(req: Request) {
  try {
    const sb = getSupabase()
    const { base64, filename } = await req.json()
    if (!base64 || !filename) {
      return NextResponse.json({ error: 'base64 and filename required' }, { status: 400 })
    }

    const content = base64.includes(',') ? base64.split(',')[1] : base64
    let ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(content, 'base64')
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    }
    let contentType = mimeMap[ext] ?? 'application/octet-stream'

    // Re-encode into a size-capped WebP before it ever reaches storage — this
    // is what stops a raw phone-camera screenshot from ending up as a
    // multi-MB file that later gets embedded somewhere it shouldn't (see the
    // projects.json incident). SVGs are vector/tiny already — leave them.
    if (ext !== 'svg') {
      try {
        const compressed = await compressImage(buffer)
        buffer = compressed.buffer
        contentType = compressed.contentType
        ext = compressed.ext
      } catch {
        // Not a real image, or sharp couldn't decode it — fall back to the
        // original bytes rather than failing the whole upload.
      }
    }

    const safeName = `tagett-${Date.now()}.${ext}`

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
