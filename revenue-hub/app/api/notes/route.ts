import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const KEY = 'pinned_notes'

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('settings')
      .select('value')
      .eq('key', KEY)
      .maybeSingle()
    if (error) throw error
    return NextResponse.json({ value: data?.value ?? '' })
  } catch {
    return NextResponse.json({ value: '' })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { value } = await req.json()
    const sb = getSupabase()
    const { error } = await sb
      .from('settings')
      .upsert({ key: KEY, value: value ?? '', updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
