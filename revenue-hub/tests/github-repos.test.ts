import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPublicRepos, repoTitle, repoToProject, type GithubRepo } from '@/lib/github-repos'

const repo = (over: Partial<GithubRepo>): GithubRepo => ({
  name: 'x', html_url: 'https://github.com/PlnDominic/x', description: null, homepage: null, language: null,
  topics: [], fork: false, archived: false, created_at: '2024-05-01T00:00:00Z', pushed_at: '2025-01-01T00:00:00Z', ...over,
})

describe('github repos as website projects', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('titles a repo from its name', () => {
    expect(repoTitle('mikjan-hotel_management')).toBe('Mikjan Hotel Management')
  })

  it('builds a project: links the live site when there is one, guesses a category', () => {
    const p = repoToProject(repo({ name: 'school-management-system', language: 'Python', homepage: 'https://school.example.com', description: 'Fees and results' }))
    expect(p).toMatchObject({ title: 'School Management System', category: 'Business Software', link: 'https://school.example.com', year: 2024, technologies: ['Python'], description: 'Fees and results' })
    expect(repoToProject(repo({ name: 'bakery', language: 'HTML' }))).toMatchObject({ category: 'Website', link: 'https://github.com/PlnDominic/x', technologies: ['HTML5'] })
    expect(repoToProject(repo({ name: 'ward-map', description: 'Leaflet map of wards' })).category).toBe('GIS')
  })

  it('skips forks, archived repos and this system\'s own repos, and reads every page', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => repo({ name: `site-${i}` }))
    const page2 = [repo({ name: 'forked', fork: true }), repo({ name: 'old', archived: true }), repo({ name: 'Tagett' }), repo({ name: 'Ecstasy-Technologies' }), repo({ name: 'last-one' })]
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('&page=1') ? page1 : page2)))
    vi.stubGlobal('fetch', fetchMock)
    const repos = await fetchPublicRepos('PlnDominic')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(repos).toHaveLength(101)
    expect(repos.at(-1)!.name).toBe('last-one')
  })

  it('surfaces a GitHub error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 })))
    await expect(fetchPublicRepos('PlnDominic', 'bad')).rejects.toThrow('Bad credentials')
  })
})
