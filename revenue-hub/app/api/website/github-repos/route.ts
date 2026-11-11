import { NextResponse } from 'next/server'
import { fetchPublicRepos, repoToProject } from '@/lib/github-repos'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const OWNER = (process.env.GITHUB_WEBSITE_REPO ?? 'PlnDominic/Ecstasy-Technologies').split('/')[0]

// GET -> the account's public repositories as website projects, ready for /api/website/bulk.
export async function GET() {
  try {
    const repos = await fetchPublicRepos(OWNER, process.env.GITHUB_WEBSITE_TOKEN)
    return NextResponse.json({ owner: OWNER, projects: repos.map(repoToProject) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not read GitHub' }, { status: 502 })
  }
}
