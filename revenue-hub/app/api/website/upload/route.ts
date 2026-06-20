import { NextResponse } from 'next/server'

const TOKEN = process.env.GITHUB_WEBSITE_TOKEN
const REPO = process.env.GITHUB_WEBSITE_REPO ?? 'PlnDominic/Ecstasy-Technologies'
const BRANCH = process.env.GITHUB_WEBSITE_BRANCH ?? 'main'

export async function POST(req: Request) {
  if (!TOKEN) return NextResponse.json({ error: 'GITHUB_WEBSITE_TOKEN not set' }, { status: 500 })
  try {
    const { base64, filename } = await req.json()
    if (!base64 || !filename) return NextResponse.json({ error: 'base64 and filename required' }, { status: 400 })
    const content = base64.includes(',') ? base64.split(',')[1] : base64
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    const safeName = `tagett-${Date.now()}.${ext}`
    const path = `public/images/projects/${safeName}`
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `[Tagett] Upload project image: ${safeName}`,
        content,
        branch: BRANCH,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err.message ?? 'Upload failed' }, { status: res.status })
    }
    return NextResponse.json({ path: `/images/projects/${safeName}` })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
