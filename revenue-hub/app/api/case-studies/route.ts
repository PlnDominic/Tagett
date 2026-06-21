import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function parseSections(text: string) {
  const parts = text.split(/\n(?=PROBLEM|SOLUTION|RESULT|PROOF_SNIPPET)/i)
  const s: Record<string, string> = {}
  for (const p of parts) {
    const m = p.match(/^(PROBLEM|SOLUTION|RESULT|PROOF_SNIPPET)\s*\n([\s\S]+)/i)
    if (m) s[m[1].toUpperCase()] = m[2].trim()
  }
  return {
    problem: s['PROBLEM'] ?? null,
    solution: s['SOLUTION'] ?? null,
    result: s['RESULT'] ?? null,
    proof_snippet: s['PROOF_SNIPPET'] ?? null,
  }
}

// GET returns Record<number, string> — project_id → raw_text
export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('case_studies').select('project_id, raw_text')
    if (error) throw error
    const out: Record<number, string> = {}
    for (const row of data ?? []) out[row.project_id as number] = row.raw_text as string
    return NextResponse.json(out)
  } catch {
    return NextResponse.json({})
  }
}

// PUT accepts Record<number, string>, upserts with parsed sections
export async function PUT(req: NextRequest) {
  try {
    const studies: Record<number, string> = await req.json()
    const sb = getSupabase()
    const rows = Object.entries(studies).map(([id, raw_text]) => ({
      project_id: parseInt(id, 10),
      raw_text,
      ...parseSections(raw_text),
      updated_at: new Date().toISOString(),
    }))
    if (rows.length > 0) {
      const { error } = await sb.from('case_studies').upsert(rows, { onConflict: 'project_id' })
      if (error) throw error
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
