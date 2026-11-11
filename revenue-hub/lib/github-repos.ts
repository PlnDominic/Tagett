// Turns a GitHub account's public repositories into website projects, so
// "Import Missing" covers every repo rather than a fixed list. Public repos
// only: the portfolio links to them, so private client work never appears.

export interface GithubRepo {
  name: string
  html_url: string
  description: string | null
  homepage: string | null
  language: string | null
  topics?: string[]
  fork: boolean
  archived: boolean
  created_at: string
  pushed_at: string
}

export interface RepoProject {
  title: string
  category: 'Website' | 'Web Application' | 'Mobile App' | 'Business Software' | 'GIS'
  description: string
  image: string
  features: string[]
  technologies: string[]
  link: string
  year: number
  status: string
}

// Repos that hold this system or the website itself, not portfolio work.
const NOT_PORTFOLIO = /^(tagett|ecstasy-technologies|plndominic|\.github)$/i

const LANGUAGE_LABEL: Record<string, string> = { HTML: 'HTML5', CSS: 'CSS3', JavaScript: 'JavaScript', TypeScript: 'TypeScript' }

/** "mikjan-hotel_management" -> "Mikjan Hotel Management". */
export function repoTitle(name: string): string {
  return name.replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b([a-z])([a-z]*)/g, (_, a: string, b: string) => a.toUpperCase() + b)
}

function categoryFor(repo: GithubRepo): RepoProject['category'] {
  const text = `${repo.name} ${repo.description ?? ''} ${(repo.topics ?? []).join(' ')}`.toLowerCase()
  if (/\b(gis|map|leaflet|geo|spatial|qgis)\b/.test(text)) return 'GIS'
  if (/\b(android|ios|flutter|react[- ]native|mobile app|expo)\b/.test(text)) return 'Mobile App'
  if (/\b(management|system|erp|crm|dashboard|inventory|portal|software)\b/.test(text)) return 'Business Software'
  if (/\b(web ?app|app|saas|platform)\b/.test(text) || ['Python', 'PHP', 'Java', 'C#'].includes(repo.language ?? '')) return 'Web Application'
  return 'Website'
}

export function repoToProject(repo: GithubRepo): RepoProject {
  const title = repoTitle(repo.name)
  const technologies = [
    ...(repo.language ? [LANGUAGE_LABEL[repo.language] ?? repo.language] : []),
    ...(repo.topics ?? []).map(t => repoTitle(t)),
  ].filter((t, i, all) => all.indexOf(t) === i).slice(0, 8)
  return {
    title,
    category: categoryFor(repo),
    description: repo.description?.trim() || `${title}, built by Ecstasy Technologies.`,
    image: '',
    features: [],
    technologies,
    link: repo.homepage?.startsWith('http') ? repo.homepage : repo.html_url,
    year: new Date(repo.created_at).getUTCFullYear(),
    status: 'completed',
  }
}

/** Every public, original repo of the account, newest first. */
export async function fetchPublicRepos(owner: string, token?: string): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = []
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100&sort=pushed&page=${page}`, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string }
      throw new Error(body.message ?? `GitHub answered ${res.status}`)
    }
    const batch = await res.json() as GithubRepo[]
    repos.push(...batch)
    if (batch.length < 100) break
  }
  return repos.filter(r => !r.fork && !r.archived && !NOT_PORTFOLIO.test(r.name))
}
