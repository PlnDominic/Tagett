import { NextResponse } from 'next/server'
import { compressImage } from '@/lib/image'

// POST can chain readFile → (mirror an external image: fetch it, check for an
// existing copy, upload it) → writeFile, up to 3 retries on a sha conflict —
// several sequential GitHub API round trips that can comfortably exceed
// Vercel's default 10s function timeout, especially mirroring a real image.
// A killed function returns an empty/non-JSON body, which the client's
// res.json() then fails on with a cryptic "Unexpected end of JSON input"
// instead of a real error. See /api/agents/run for the same pattern.
export const maxDuration = 60

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

  // GitHub's Contents API only embeds base64 `content` for files under 1MB —
  // past that it comes back empty (this file has hit that size, almost
  // certainly from a project image stored as a raw data: URI instead of a
  // hosted path). Fall back to the plain download_url, which has no such
  // limit, instead of JSON.parse()-ing an empty string.
  let raw: string
  if (data.content) {
    raw = Buffer.from(data.content, 'base64').toString('utf-8')
  } else if (data.download_url) {
    const dl = await fetch(data.download_url)
    if (!dl.ok) throw new Error(`Failed to fetch large projects.json via download_url: HTTP ${dl.status}`)
    raw = await dl.text()
  } else {
    throw new Error('GitHub returned no content and no download_url for projects.json')
  }

  let projects: WebsiteProject[]
  try {
    projects = JSON.parse(raw)
  } catch {
    throw new Error('projects.json is not valid JSON — it may need manual repair in the repo')
  }
  return { projects, sha: data.sha }
}

// Read-modify-write against a single GitHub file races: two requests landing close
// together (double-tap publish, sync-all overlapping a manual edit) both read the
// same sha, and the second PUT gets rejected with 409. Retry with a fresh read/sha
// on conflict instead of surfacing that as an opaque 500.
async function writeFile(
  mutate: (current: WebsiteProject[]) => WebsiteProject[],
  commitMsg: string,
  maxRetries = 2
): Promise<WebsiteProject[]> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { projects, sha } = await readFile()
    const next = mutate(projects)
    const content = Buffer.from(JSON.stringify(next, null, 2) + '\n').toString('base64')
    const body: Record<string, unknown> = { message: commitMsg, content, branch: BRANCH }
    if (sha) body.sha = sha
    const res = await fetch(API_BASE, { method: 'PUT', headers: githubHeaders(), body: JSON.stringify(body) })
    if (res.ok) return next
    if (res.status === 409 && attempt < maxRetries) continue
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `GitHub ${res.status}`)
  }
  throw new Error('Failed to write projects.json after retries')
}

// Mirror an external image (e.g. Supabase storage) into public/project-images/ on the
// website repo so it loads as a simple relative path — no Next.js remotePatterns needed.
async function mirrorImageToWebsite(imageUrl: string): Promise<string> {
  if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl

  let filename = imageUrl.split('/').pop()?.split('?')[0] ?? ''
  if (!filename) return imageUrl

  // Fetch the image bytes
  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) })
  if (!imgRes.ok) return imageUrl
  let buffer: Buffer<ArrayBufferLike> = Buffer.from(await imgRes.arrayBuffer())

  // Re-encode into a size-capped WebP before it's committed to the repo —
  // images uploaded through /api/website/upload are already compressed, but
  // this also covers a pasted external image URL that never went through
  // that route. Skip SVGs (already tiny, vector).
  if (!filename.toLowerCase().endsWith('.svg')) {
    try {
      const compressed = await compressImage(buffer)
      buffer = compressed.buffer
      filename = filename.replace(/\.[a-zA-Z0-9]+$/, '') + '.' + compressed.ext
    } catch {
      // Not decodable as an image — commit the original bytes as-is.
    }
  }
  const githubPath = `public/project-images/${filename}`
  const base64 = buffer.toString('base64')

  // Check if the file already exists in the repo (need its SHA to update)
  const checkRes = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${githubPath}?ref=${BRANCH}`,
    { headers: githubHeaders() }
  )
  const checkData = checkRes.ok ? await checkRes.json() : null

  const body: Record<string, unknown> = {
    message: `[Tagett] Add project image: ${filename}`,
    content: base64,
    branch: BRANCH,
  }
  if (checkData?.sha) body.sha = checkData.sha

  const uploadRes = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${githubPath}`,
    { method: 'PUT', headers: githubHeaders(), body: JSON.stringify(body) }
  )
  if (!uploadRes.ok) return imageUrl

  return `/project-images/${filename}`
}

export async function GET() {
  if (!TOKEN) return NextResponse.json({ error: 'GITHUB_WEBSITE_TOKEN not set' }, { status: 500 })
  try {
    const { projects } = await readFile()
    return NextResponse.json(projects)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!TOKEN) return NextResponse.json({ error: 'GITHUB_WEBSITE_TOKEN not set' }, { status: 500 })
  try {
    const body = await req.json()
    if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 })

    // A raw data: URI (a failed /api/website/upload silently falling back to
    // the base64 it never got to upload) is what previously bloated
    // projects.json past GitHub's 1MB inline-content limit and broke every
    // read of it. Refuse it outright instead of writing it into the file —
    // the client should retry the upload, not fall back to embedding it.
    if (typeof body.image === 'string' && body.image.startsWith('data:')) {
      return NextResponse.json({ error: 'Image upload did not finish — please re-upload the image (a data: URI can\'t be saved directly, it would bloat the file past GitHub\'s size limit).' }, { status: 400 })
    }

    // Mirror external images (Supabase, etc.) into the website's public folder
    if (body.image?.startsWith('http')) {
      body.image = await mirrorImageToWebsite(body.image)
    }

    let saved: WebsiteProject
    let wasUpdate = false
    await writeFile((projects) => {
      const existingIdx = body.id ? projects.findIndex((p: WebsiteProject) => p.id === body.id) : -1
      wasUpdate = existingIdx >= 0
      if (existingIdx >= 0) {
        saved = { ...projects[existingIdx], ...body }
        const next = [...projects]
        next[existingIdx] = saved
        return next
      }
      const maxId = projects.reduce((m: number, p: WebsiteProject) => Math.max(m, p.id), 0)
      saved = { image: '', features: [], technologies: [], ...body, id: maxId + 1, updatedAt: new Date().toISOString() }
      return [saved, ...projects]
    }, `[Tagett] ${wasUpdate ? 'Update' : 'Add'} project: ${body.title}`)

    return NextResponse.json({ ok: true, id: saved!.id, image: saved!.image })
  } catch (err) {
    console.error('[website/projects] POST failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  if (!TOKEN) return NextResponse.json({ error: 'GITHUB_WEBSITE_TOKEN not set' }, { status: 500 })
  try {
    const { id } = await req.json()
    let found = true
    await writeFile((projects) => {
      const filtered = projects.filter((p: WebsiteProject) => p.id !== id)
      found = filtered.length !== projects.length
      return filtered
    }, `[Tagett] Remove project: ${id}`)
    return NextResponse.json({ ok: true, found })
  } catch (err) {
    console.error('[website/projects] DELETE failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
