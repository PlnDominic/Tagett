import { NextResponse } from 'next/server'

const TOKEN  = process.env.GITHUB_WEBSITE_TOKEN
const REPO   = process.env.GITHUB_WEBSITE_REPO   ?? 'PlnDominic/Ecstasy-Technologies'
const BRANCH = process.env.GITHUB_WEBSITE_BRANCH ?? 'main'
const FILE   = 'src/app/projects/page.tsx'

function githubHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

// Fixed projects page — handles empty images and broken-image fallback
const FIXED_PAGE = `'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SharedLayout from '@/components/SharedLayout';
import ProjectModal from '@/components/ProjectModal';
import projectsData from '../../../data/projects.json';

const PROJECTS = projectsData as Array<{
  id: number; title: string; category: string; description: string;
  image: string; features: string[]; technologies: string[]; link?: string;
}>;

const FILTERS = ['All', 'Website', 'Web Application', 'Mobile App', 'Business Software'];

function ProjectImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#333', fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
          [ preview soon ]
        </span>
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover ip-proj-img"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={80}
      onError={() => setFailed(true)}
    />
  )
}

export default function Projects() {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const filteredProjects = activeFilter === 'All'
    ? PROJECTS
    : PROJECTS.filter(p => p.category === activeFilter);

  const handleProjectClick = (project: any) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  return (
    <SharedLayout>
      <main className="relative z-10">
        <div className="ip-wrap">

          {/* ── Page header ── */}
          <div className="ip-page-head">
            <div style={{ marginBottom: '1rem' }}>
              <hr className="es-rule" />
              <span className="es-section-label">ALL WORK</span>
            </div>
            <h1 className="ip-heading">
              32+<br />
              <span style={{ color: 'var(--accent)' }}>PROJECTS.</span>
            </h1>
            <p className="ip-body" style={{ marginTop: '1.5rem' }}>
              Every project we&#39;ve built &#8212; websites, applications, and enterprise systems for clients across Africa and beyond.
            </p>
          </div>

          {/* ── Filters ── */}
          <div className="ip-filters">
            {FILTERS.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={\`btn-press ip-filter-btn\${activeFilter === filter ? ' active' : ''}\`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* ── Project grid ── */}
          <div className="ip-proj-grid" style={{ marginBottom: 'clamp(3rem, 5vw, 5rem)' }}>
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className="ip-proj-card"
                onClick={() => handleProjectClick(project)}
              >
                <div className="ip-proj-img-wrap">
                  <ProjectImage src={project.image} alt={project.title} />
                </div>
                <div className="ip-proj-info">
                  <span className="ip-cat-badge">{project.category}</span>
                  <h3 className="ip-proj-name">{project.title}</h3>
                  <p className="ip-proj-desc">{project.description}</p>
                </div>
                <div className="ip-proj-foot">
                  <button className="btn-press ip-proj-details-btn">
                    View Details &#8594;
                  </button>
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ip-proj-visit"
                      onClick={e => e.stopPropagation()}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Visit Site
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── CTA ── */}
          <div className="ip-cta">
            <h2 className="ip-cta-head">
              YOUR PROJECT<br />
              <span className="ip-cta-accent">NEXT.</span>
            </h2>
            <div className="ip-cta-side">
              <p className="ip-cta-sub">
                Join 32+ organisations that trust Ecstasy to build their digital infrastructure.
              </p>
              <Link href="/contact" className="btn-press ip-cta-btn">
                Start a Project
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
                </svg>
              </Link>
            </div>
          </div>

        </div>
      </main>

      {selectedProject && (
        <ProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          project={selectedProject}
        />
      )}
    </SharedLayout>
  );
}
`

export async function POST() {
  if (!TOKEN) return NextResponse.json({ error: 'GITHUB_WEBSITE_TOKEN not set' }, { status: 500 })

  try {
    const apiUrl = `https://api.github.com/repos/${REPO}/contents/${FILE}`

    // Get current SHA
    const existing = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers: githubHeaders() })
    const existingData = existing.ok ? await existing.json() : null
    const sha = existingData?.sha ?? null

    const content = Buffer.from(FIXED_PAGE).toString('base64')
    const body: Record<string, unknown> = {
      message: '[Tagett] Fix project image rendering — handle empty images and broken-image fallback',
      content,
      branch: BRANCH,
    }
    if (sha) body.sha = sha

    const res = await fetch(apiUrl, { method: 'PUT', headers: githubHeaders(), body: JSON.stringify(body) })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message ?? `GitHub ${res.status}`)
    }

    return NextResponse.json({ ok: true, message: 'projects/page.tsx updated — website will redeploy' })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
