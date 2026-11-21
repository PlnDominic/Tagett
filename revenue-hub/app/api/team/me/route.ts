import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Who am I? Lets the app show the right screens for an admin or a rep.
export async function GET(req: NextRequest) {
  const a = getActor(req)
  return NextResponse.json({ id: a.id, name: a.name, email: a.email, role: a.role === 'member' ? 'member' : 'admin' })
}
