import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50)
    const offset = Number(searchParams.get('offset') ?? 0)

    const sb = getSupabase()
    const { data, error, count } = await sb
      .from('agent_runs')
      .select('*', { count: 'exact' })
      .order('run_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return NextResponse.json({ runs: data ?? [], total: count ?? 0 })
  } catch {
    return NextResponse.json({ runs: [], total: 0 })
  }
}
