import { NextResponse } from 'next/server'

const TOKEN = process.env.GITHUB_WEBSITE_TOKEN
const REPO  = process.env.GITHUB_WEBSITE_REPO  ?? 'PlnDominic/Ecstasy-Technologies'
const FILE  = process.env.GITHUB_WEBSITE_FILE  ?? 'data/projects.json'
const BRANCH = process.env.GITHUB_WEBSITE_BRANCH ?? 'main'

const API_BASE = `https://api.github.com/repos/${REPO}/contents/${FILE}`

function githubHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export interface WebsiteProject {
  id: number
  title: string
  category: 'Website' | 'Web Application' | 'Mobile App' | 'Business Software' | 'GIS'
  description: string
  image: string
  features: string[]
  technologies: string[]
  link?: string
  // Tagett extras — present in JSON, ignored by the website renderer
  year?: number
  client?: string
  featured?: boolean
  status?: 'completed' | 'in-progress'
  updatedAt?: string
}

async function readFile(): Promise<{ projects: WebsiteProject[]; sha: string | null }> {
  const res = await fetch(`${API_BASE}?ref=${BRANCH}`, { headers: githubHeaders() })
  if (res.status === 404) return { projects: [], sha: null }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `GitHub ${res.status}`)
  }
  const data = await res.json()
  const raw = Buffer.from(data.content, 'base64').toString('utf-8')
  return { projects: JSON.parse(raw), sha: data.sha }
}

async function writeFile(projects: WebsiteProject[], sha: string | null, commitMsg: string) {
  const content = Buffer.from(JSON.stringify(projects, null, 2) + '\n').toString('base64')
  const body: Record<string, unknown> = { message: commitMsg, content, branch: BRANCH }
  if (sha) body.sha = sha
  const res = await fetch(API_BASE, { method: 'PUT', headers: githubHeaders(), body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `GitHub ${res.status}`)
  }
}

export async function GET() {
  if (!TOKEN) return NextResponse.json({ error: 'GITHUB_WEBSITE_TOKEN not set' }, { status: 500 })
  try {
    const { projects } = await readFile()
    return NextResponse.json(projects)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!TOKEN) return NextResponse.json({ error: 'GITHUB_WEBSITE_TOKEN not set' }, { status: 500 })
  try {
    const body = await req.json()
    if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
    const { projects, sha } = await readFile()
    const existingIdx = body.id ? projects.findIndex(p => p.id === body.id) : -1
    let project: WebsiteProject
    if (existingIdx >= 0) {
      project = { ...projects[existingIdx], ...body }
      projects[existingIdx] = project
    } else {
      const maxId = projects.reduce((m, p) => Math.max(m, p.id), 0)
      project = { image: '', features: [], technologies: [], ...body, id: maxId + 1, updatedAt: new Date().toISOString() }
      projects.unshift(project)
    }
    await writeFile(projects, sha, `[Tagett] ${existingIdx >= 0 ? 'Update' : 'Add'} project: ${project.title}`)
    return NextResponse.json({ ok: true, id: project.id })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  if (!TOKEN) return NextResponse.json({ error: 'GITHUB_WEBSITE_TOKEN not set' }, { status: 500 })
  try {
    const { id } = await req.json()
    const { projects, sha } = await readFile()
    const filtered = projects.filter(p => p.id !== id)
    if (filtered.length === projects.length) return NextResponse.json({ ok: true })
    await writeFile(filtered, sha, `[Tagett] Remove project: ${id}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
