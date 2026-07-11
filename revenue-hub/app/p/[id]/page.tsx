'use client'

import { useEffect, useState } from 'react'

const GOLD = '#E84040'
const GOLD_DEEP = '#C82F2F'
const DOMINIC_PHONE = '233542855399'

interface Proposal {
  id: string
  businessName: string
  industry: string | null
  scope: string
  priceGHS: number
  status: string
}

export default function ProposalPage({ params }: { params: { id: string } }) {
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/proposals/${params.id}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Could not load this proposal.'); return }
        setProposal(data)
      })
      .catch(() => setError('Network error.'))
  }, [params.id])

  const acceptUrl = proposal
    ? `https://wa.me/${DOMINIC_PHONE}?text=${encodeURIComponent(
        `Hi Dominic, I'd like to go ahead with the ${proposal.businessName} project — GHS ${proposal.priceGHS.toLocaleString()}.`
      )}`
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
      <style>{`
        .prop-cta {
          display: block; width: 100%; text-align: center; text-decoration: none;
          padding: 0.9rem; border-radius: 12px; margin-top: 1.75rem;
          background: linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%);
          color: #fff; font-weight: 700; font-size: 15px; letter-spacing: 0.01em;
          box-shadow: 0 10px 24px -8px rgba(232,64,64,0.55);
          transition: filter 0.15s ease;
        }
        .prop-cta:hover { filter: brightness(1.06); }
      `}</style>

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

        {!error && !proposal && (
          <div style={{ textAlign: 'center', color: '#7a7880', fontSize: 14, padding: '3rem 0' }}>
            Loading…
          </div>
        )}

        {proposal && (
          <div style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '2.25rem 1.75rem',
            boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
          }}>
            {proposal.industry && (
              <div style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: GOLD, background: `${GOLD}18`, border: `1px solid ${GOLD}40`, borderRadius: 20,
                padding: '4px 12px', marginBottom: 14,
              }}>
                {proposal.industry}
              </div>
            )}

            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F5F3F0', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.25 }}>
              Proposal for {proposal.businessName}
            </h1>

            {proposal.scope && (
              <div style={{ marginTop: 20, fontSize: 14.5, color: '#c8c6cc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {proposal.scope}
              </div>
            )}

            <div style={{
              marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12.5, color: '#7a7880', letterSpacing: '0.02em' }}>Investment</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#F5F3F0', letterSpacing: '-0.02em' }}>
                GHS {proposal.priceGHS.toLocaleString()}
              </span>
            </div>

            <a href={acceptUrl} target="_blank" rel="noopener noreferrer" className="prop-cta">
              Accept — Message Dominic
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
