'use client'

import { useEffect, useState } from 'react'

const GOLD = '#E84040'
const WA_GREEN = '#25D366'
const DOMINIC_PHONE = '233542855399'

const STEPS = [
  { id: 'kickoff', label: 'Kickoff' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'delivered', label: 'Delivered' },
] as const

interface PortalData {
  id: string
  clientName: string
  projectTitle: string
  status: string
  milestones: Array<{ label: string; amountGHS: number; paid: boolean }>
}

export default function ClientPortalPage({ params }: { params: { id: string } }) {
  const [portal, setPortal] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/portals/${params.id}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Could not load this page.'); return }
        setPortal(data)
      })
      .catch(() => setError('Network error.'))
  }, [params.id])

  const stepIndex = portal ? STEPS.findIndex(s => s.id === portal.status) : 0
  const totalDue = portal ? portal.milestones.filter(m => !m.paid).reduce((s, m) => s + m.amountGHS, 0) : 0

  const waUrl = portal
    ? `https://wa.me/${DOMINIC_PHONE}?text=${encodeURIComponent(`Hi Dominic, about the ${portal.projectTitle} project…`)}`
    : '#'

  return (
    <div style={{
      minHeight: '100%',
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      justifyContent: 'center',
      background: `
        radial-gradient(60% 50% at 50% 0%, rgba(232,64,64,0.10) 0%, rgba(232,64,64,0) 60%),
        radial-gradient(90% 70% at 50% 100%, #16161a 0%, #0a0a0c 100%)
      `,
      fontFamily: "'Inter', sans-serif",
      padding: '2.5rem 1.25rem',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="Ecstasy Technologies" width={48} height={48} style={{ borderRadius: 12, display: 'inline-block' }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7a7880', marginTop: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Ecstasy Technologies
          </div>
        </div>

        {error && (
          <div style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '2.5rem 2rem',
            textAlign: 'center', color: '#9a98a0', fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {!error && !portal && (
          <div style={{ textAlign: 'center', color: '#7a7880', fontSize: 14, padding: '3rem 0' }}>
            Loading…
          </div>
        )}

        {portal && (
          <div style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '2.25rem 1.75rem',
            boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
          }}>
            <div style={{ fontSize: 12, color: '#7a7880', letterSpacing: '0.02em', marginBottom: 6 }}>
              Project portal for {portal.clientName}
            </div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: '#F5F3F0', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.25 }}>
              {portal.projectTitle}
            </h1>

            {/* Status stepper */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 26, marginBottom: 4 }}>
              {STEPS.map((step, i) => {
                const done = i <= stepIndex
                return (
                  <div key={step.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {i > 0 && (
                      <div style={{
                        position: 'absolute', top: 11, right: '50%', width: '100%', height: 2,
                        background: i <= stepIndex ? GOLD : 'rgba(255,255,255,0.10)', zIndex: 0,
                      }} />
                    )}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', zIndex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? GOLD : '#1a1a1e',
                      border: `2px solid ${done ? GOLD : 'rgba(255,255,255,0.15)'}`,
                      color: '#fff', fontSize: 12, fontWeight: 700,
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 7, color: done ? '#F5F3F0' : '#7a7880', fontWeight: done ? 600 : 400, textAlign: 'center' }}>
                      {step.label}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Milestones / payments */}
            {portal.milestones.length > 0 && (
              <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7a7880', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Payment Milestones
                </div>
                {portal.milestones.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0, fontSize: 11,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: m.paid ? `${WA_GREEN}25` : 'rgba(255,255,255,0.06)',
                      color: m.paid ? WA_GREEN : '#7a7880',
                      border: `1px solid ${m.paid ? WA_GREEN + '50' : 'rgba(255,255,255,0.12)'}`,
                    }}>
                      {m.paid ? '✓' : ''}
                    </div>
                    <div style={{ flex: 1, fontSize: 14, color: m.paid ? '#9a98a0' : '#F0EDE8' }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: m.paid ? '#9a98a0' : '#F5F3F0' }}>
                      GHS {m.amountGHS.toLocaleString()}
                    </div>
                  </div>
                ))}
                {totalDue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize: 12.5, color: '#7a7880' }}>Balance due</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#F5F3F0' }}>GHS {totalDue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none',
              padding: '0.85rem', borderRadius: 12, marginTop: 26, boxSizing: 'border-box',
              background: WA_GREEN, color: '#fff', fontWeight: 700, fontSize: 14.5,
              boxShadow: '0 10px 24px -8px rgba(37,211,102,0.45)',
            }}>
              Message Dominic on WhatsApp
            </a>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: 11, color: '#54525a', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          Building software Africa trusts
        </div>
      </div>
    </div>
  )
}
