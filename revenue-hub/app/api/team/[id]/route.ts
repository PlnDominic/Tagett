import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, describeDbError } from '@/lib/supabase'
import { denyUnlessAdmin, getActor } from '@/lib/auth'
import { generatePassword } from '@/lib/password'

export const dynamic = 'force-dynamic'

// PATCH { name?, role?, active?, resetPassword? }
//   active:false  — deactivate: banned in Supabase (they are signed out and
//                   cannot sign back in) and their deals go back to the
//                   unassigned pool so someone else can pick them up.
//   resetPassword — sets a new generated password and returns it once.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = denyUnlessAdmin(req)
  if (denied) return denied
  const { id } = await params
  const actor = getActor(req)
  const body = await req.json().catch(() => ({})) as { name?: string; role?: string; active?: boolean; resetPassword?: boolean }
  if (id === actor.id && (body.active === false || (body.role && body.role !== 'admin'))) {
    return NextResponse.json({ error: "You can't deactivate or demote your own account." }, { status: 400 })
  }
  try {
    const sb = getSupabase()
    const attrs: Record<string, unknown> = {}
    let password: string | undefined
    if (body.name?.trim()) attrs.user_metadata = { name: body.name.trim() }
    if (body.role === 'admin' || body.role === 'member') attrs.app_metadata = { role: body.role }
    if (body.active === false) attrs.ban_duration = '876000h'
    if (body.active === true) attrs.ban_duration = 'none'
    if (body.resetPassword) { password = generatePassword(); attrs.password = password }
    if (Object.keys(attrs).length === 0) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 })

    const { error } = await sb.auth.admin.updateUserById(id, attrs)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    let released = 0
    if (body.active === false) {
      const { data } = await sb.from('deals').update({ owner_id: null, owner_name: null }).eq('owner_id', id).select('id')
      released = data?.length ?? 0
    } else if (body.name?.trim()) {
      await sb.from('deals').update({ owner_name: body.name.trim() }).eq('owner_id', id)
    }
    return NextResponse.json({ ok: true, ...(password ? { password } : {}), released })
  } catch (err) {
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 })
  }
}
