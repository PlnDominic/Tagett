import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { compressImage } from '@/lib/image'

// One-time (re-runnable, idempotent) cleanup: shrink every image already
// sitting in Supabase Storage's project-images bucket and every image already
// mirrored into the website repo's public/project-images folder. Ongoing
// uploads are compressed automatically by /api/website/upload and
// mirrorImageToWebsite in /api/website/projects — this route is only for
// what was stored before that existed.
export const maxDuration = 120

const BUCKET = 'project-images'

const TOKEN = process.env.GITHUB_WEBSITE_TOKEN
const REPO = process.env.GITHUB_WEBSITE_REPO ?? 'PlnDominic/Ecstasy-Technologies'
const FILE = process.env.GITHUB_WEBSITE_FILE ?? 'data/projects.json'
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

interface WebsiteProject {
  id: number
  title: string
  image: string
  [key: string]: unknown
}

async function readProjectsFile(): Promise<{ projects: WebsiteProject[]; sha: string | null }> {
  const res = await fetch(`${API_BASE}?ref=${BRANCH}`, { headers: githubHeaders() })
  if (res.status === 404) return { projects: [], sha: null }
  if (!res.ok) throw new Error(`GitHub ${res.status} reading projects.json`)
  const data = await res.json()
  let raw: string
  if (data.content) {
    raw = Buffer.from(data.content, 'base64').toString('utf-8')
  } else if (data.download_url) {
    const dl = await fetch(data.download_url)
    raw = await dl.text()
  } else {
    throw new Error('No content or download_url for projects.json')
  }
  return { projects: JSON.parse(raw), sha: data.sha }
}

async function writeProjectsFile(projects: WebsiteProject[], sha: string | null, message: string): Promise<boolean> {
  const content = Buffer.from(JSON.stringify(projects, null, 2) + '\n').toString('base64')
  const body: Record<string, unknown> = { message, content, branch: BRANCH }
  if (sha) body.sha = sha
  const res = await fetch(API_BASE, { method: 'PUT', headers: githubHeaders(), body: JSON.stringify(body) })
  if (res.ok) return true
  if (res.status === 409) return false // stale sha — caller re-reads and retries
  const err = await res.json().catch(() => ({}))
  throw new Error((err as { message?: string }).message ?? `GitHub ${res.status} writing projects.json`)
}

// Re-reads the live file and re-applies just the tracked id -> new image path
// changes on top of whatever it currently contains, retrying on a sha
// conflict instead of blindly overwriting with a stale in-memory copy. This
// is what a concurrent run (e.g. a client retry that raced an earlier
// still-running request) needs: without it, a losing write's file
// renames/deletes still happened, but the JSON pointing at them never
// landed — exactly what happened the first time this route ran twice at once.
async function applyImageUpdates(updates: Map<number, string>, message: string, maxRetries = 3): Promise<void> {
  if (updates.size === 0) return
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { projects, sha } = await readProjectsFile()
    for (const project of projects) {
      const next = updates.get(project.id)
      if (next) project.image = next
    }
    if (await writeProjectsFile(projects, sha, message)) return
    if (attempt === maxRetries) throw new Error('Failed to write projects.json after retries (repeated sha conflict)')
  }
}

async function githubGetFile(path: string): Promise<{ buffer: Buffer; sha: string } | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`, { headers: githubHeaders() })
  if (!res.ok) return null
  const data = await res.json()
  if (data.content) return { buffer: Buffer.from(data.content, 'base64'), sha: data.sha }
  if (data.download_url) {
    const dl = await fetch(data.download_url)
    return { buffer: Buffer.from(await dl.arrayBuffer()), sha: data.sha }
  }
  return null
}

async function githubPutFile(path: string, buffer: Buffer, message: string, sha?: string): Promise<boolean> {
  const body: Record<string, unknown> = { message, content: buffer.toString('base64'), branch: BRANCH }
  if (sha) body.sha = sha
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, { method: 'PUT', headers: githubHeaders(), body: JSON.stringify(body) })
  return res.ok
}

async function githubDeleteFile(path: string, sha: string, message: string): Promise<void> {
  await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'DELETE', headers: githubHeaders(), body: JSON.stringify({ message, sha, branch: BRANCH }),
  }).catch(() => {})
}

export async function POST() {
  const summary = {
    supabase: { processed: 0, skipped: 0, failed: 0, bytesBefore: 0, bytesAfter: 0 },
    github: { processed: 0, skipped: 0, failed: 0, bytesBefore: 0, bytesAfter: 0 },
  }

  // ── 1. Supabase Storage bucket ────────────────────────────────────────────
  // Images here are served by their stored content-type metadata, not their
  // filename — safe to overwrite in place at the same path/URL.
  try {
    const sb = getSupabase()
    const { data: files, error } = await sb.storage.from(BUCKET).list()
    if (error) throw error
    for (const file of files ?? []) {
      if (file.name.toLowerCase().endsWith('.svg')) { summary.supabase.skipped++; continue }
      try {
        const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(file.name)
        if (dlErr || !blob) { summary.supabase.failed++; continue }
        const original = Buffer.from(await blob.arrayBuffer())
        const compressed = await compressImage(original)
        summary.supabase.bytesBefore += original.length
        if (compressed.buffer.length >= original.length) {
          // Already smaller than we'd make it — leave it alone.
          summary.supabase.bytesAfter += original.length
          summary.supabase.skipped++
          continue
        }
        const { error: upErr } = await sb.storage.from(BUCKET).update(file.name, compressed.buffer, { contentType: compressed.contentType, upsert: true })
        if (upErr) { summary.supabase.failed++; continue }
        summary.supabase.bytesAfter += compressed.buffer.length
        summary.supabase.processed++
      } catch {
        summary.supabase.failed++
      }
    }
  } catch (err) {
    return NextResponse.json({ error: `Supabase stage failed: ${err instanceof Error ? err.message : 'unknown'}`, summary }, { status: 500 })
  }

  // ── 2. GitHub repo public/project-images/ ─────────────────────────────────
  // These are served by file extension via the website's own static hosting,
  // so a compressed file gets renamed to .webp and projects.json is updated
  // to match in the same run; the old file is then deleted.
  if (TOKEN) {
    try {
      const { projects } = await readProjectsFile()
      const updates = new Map<number, string>()
      for (const project of projects) {
        const img = project.image
        if (typeof img !== 'string' || !img.startsWith('/project-images/')) { summary.github.skipped++; continue }
        const filename = img.replace('/project-images/', '')
        if (filename.toLowerCase().endsWith('.webp') || filename.toLowerCase().endsWith('.svg')) { summary.github.skipped++; continue }

        const oldPath = `public/project-images/${filename}`
        const file = await githubGetFile(oldPath)
        if (!file) { summary.github.skipped++; continue }
        try {
          const compressed = await compressImage(file.buffer)
          summary.github.bytesBefore += file.buffer.length
          if (compressed.buffer.length >= file.buffer.length) {
            summary.github.bytesAfter += file.buffer.length
            summary.github.skipped++
            continue
          }
          const newFilename = filename.replace(/\.[a-zA-Z0-9]+$/, '') + '.webp'
          const newPath = `public/project-images/${newFilename}`
          const ok = await githubPutFile(newPath, compressed.buffer, `[Tagett] Compress project image: ${filename} -> ${newFilename}`)
          if (!ok) { summary.github.failed++; continue }
          await githubDeleteFile(oldPath, file.sha, `[Tagett] Remove uncompressed image: ${filename}`)
          // Track the change rather than mutating this stale in-memory copy —
          // applyImageUpdates re-reads the live file right before writing.
          updates.set(project.id, `/project-images/${newFilename}`)
          summary.github.bytesAfter += compressed.buffer.length
          summary.github.processed++
        } catch {
          summary.github.failed++
        }
      }
      await applyImageUpdates(updates, '[Tagett] Point compressed images at their new .webp files')
    } catch (err) {
      return NextResponse.json({ error: `GitHub stage failed: ${err instanceof Error ? err.message : 'unknown'}`, summary }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, summary })
}
