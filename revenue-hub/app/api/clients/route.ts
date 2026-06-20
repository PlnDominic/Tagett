import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sb = getSupabase()
    const { data, error } = await sb
      .from('clients')
      .insert({
        name: body.name,
        phone: body.phone ?? null,
        whatsapp: body.whatsapp ?? null,
        email: body.email ?? null,
        website: body.website ?? null,
        industry: body.industry ?? null,
        notes: body.notes ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...fields } = body
    const sb = getSupabase()
    const { error } = await sb
      .from('clients')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const sb = getSupabase()
    const { error } = await sb.from('clients').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
