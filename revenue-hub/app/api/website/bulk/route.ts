import { NextResponse } from 'next/server'

const TOKEN = process.env.GITHUB_WEBSITE_TOKEN
const REPO = process.env.GITHUB_WEBSITE_REPO ?? 'PlnDominic/Ecstasy-Technologies'
const FILE = process.env.GITHUB_WEBSITE_FILE ?? 'data/projects.json'
const BRANCH = process.env.GITHUB_WEBSITE_BRANCH ?? 'main'
const API_BASE = `https://api.github.com/repos/${REPO}/contents/${FILE}`

interface WebsiteProject {
  id: number
  title: string
  category: string
  description: string
  image: string
  features: string[]
  technologies: string[]
  link?: string
  year?: number
  status?: string
  updatedAt?: string
}

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function readFile(): Promise<{ projects: WebsiteProject[]; sha: string | null }> {
  const res = await fetch(`${API_BASE}?ref=${BRANCH}`, { headers: headers() })
  if (res.status === 404) return { projects: [], sha: null }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `GitHub ${res.status}`)
  }
  const data = await res.json()
  const raw = Buffer.from(data.content, 'base64').toString('utf-8')
  return { projects: JSON.parse(raw), sha: data.sha }
}

// POST { projects: Partial<WebsiteProject>[] }
// Reads current file, skips titles already present, appends new ones, writes once.
// Retries on 409 (sha conflict from a concurrent write) with a fresh read instead
// of surfacing that as an opaque 500.
export async function POST(req: Request) {
  if (!TOKEN) return NextResponse.json({ error: 'GITHUB_WEBSITE_TOKEN not set' }, { status: 500 })
  try {
    const incoming: Partial<WebsiteProject>[] = await req.json()
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: 'Provide a non-empty array of projects' }, { status: 400 })
    }

    let added: string[] = []
    let skipped: string[] = []
    const maxRetries = 2

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const { projects, sha } = await readFile()
      const existingTitles = new Set(projects.map(p => p.title.toLowerCase()))
      let maxId = projects.reduce((m, p) => Math.max(m, p.id), 0)
      added = []
      skipped = []

      for (const p of incoming) {
        if (!p.title) continue
        if (existingTitles.has(p.title.toLowerCase())) {
          skipped.push(p.title)
          continue
        }
        maxId += 1
        projects.unshift({
          image: '',
          features: [],
          technologies: [],
          status: 'completed',
          ...p,
          id: maxId,
          updatedAt: new Date().toISOString(),
        } as WebsiteProject)
        existingTitles.add(p.title.toLowerCase())
        added.push(p.title)
      }

      if (added.length === 0) {
        return NextResponse.json({ ok: true, added: 0, skipped: skipped.length, skippedTitles: skipped })
      }

      const content = Buffer.from(JSON.stringify(projects, null, 2) + '\n').toString('base64')
      const body: Record<string, unknown> = {
        message: `[Tagett] Bulk import ${added.length} project(s)`,
        content,
        branch: BRANCH,
      }
      if (sha) body.sha = sha

      const res = await fetch(API_BASE, { method: 'PUT', headers: headers(), body: JSON.stringify(body) })
      if (res.ok) {
        return NextResponse.json({ ok: true, added: added.length, addedTitles: added, skipped: skipped.length, skippedTitles: skipped })
      }
      if (res.status === 409 && attempt < maxRetries) continue
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message ?? `GitHub ${res.status}`)
    }

    throw new Error('Failed to write projects.json after retries')
  } catch (err) {
    console.error('[website/bulk] POST failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
