'use client'

import { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

const GOLD = '#E84040'
const GOLD_DEEP = '#C82F2F'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const sb = getSupabaseBrowser()
      const { error: authError } = await sb.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message)
        setLoading(false)
      } else {
        window.location.href = '/'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `
        radial-gradient(60% 50% at 50% 0%, rgba(232,64,64,0.10) 0%, rgba(232,64,64,0) 60%),
        radial-gradient(90% 70% at 50% 100%, #16161a 0%, #0a0a0c 100%)
      `,
      fontFamily: "'Inter', sans-serif",
      padding: '1.25rem',
    }}>
      <style>{`
        .tg-field {
          width: 100%;
          padding: 0.75rem 0.9rem;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          color: #F0EDE8;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .tg-field::placeholder { color: #55555c; }
        .tg-field:focus {
          border-color: rgba(232,64,64,0.55);
          background: rgba(255,255,255,0.045);
          box-shadow: 0 0 0 3px rgba(232,64,64,0.12);
        }
        .tg-submit {
          width: 100%;
          padding: 0.8rem;
          background: linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.01em;
          cursor: pointer;
          box-shadow: 0 8px 20px -8px rgba(232,64,64,0.55);
          transition: filter 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
        }
        .tg-submit:hover:not(:disabled) { filter: brightness(1.06); box-shadow: 0 10px 24px -8px rgba(232,64,64,0.65); }
        .tg-submit:active:not(:disabled) { transform: translateY(1px); }
        .tg-submit:disabled { opacity: 0.7; cursor: default; box-shadow: none; }
        .tg-spinner {
          display: inline-block;
          width: 13px;
          height: 13px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: tg-spin 0.7s linear infinite;
          vertical-align: -2px;
          margin-right: 7px;
        }
        @keyframes tg-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '2.5rem 2rem 2.25rem',
        boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            filter: 'drop-shadow(0 10px 24px rgba(232,64,64,0.28))',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="Tagett" width={64} height={64} style={{ borderRadius: 16, display: 'block' }} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#F5F3F0', letterSpacing: '-0.02em' }}>Tagett</div>
          <div style={{ fontSize: 12.5, color: '#7a7880', marginTop: 3, letterSpacing: '0.02em' }}>Ecstasy Technologies</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#9a98a0', marginBottom: 6, letterSpacing: '0.01em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
              className="tg-field"
            />
          </div>

          <div style={{ marginBottom: '1.4rem' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#9a98a0', marginBottom: 6, letterSpacing: '0.01em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="tg-field"
            />
          </div>

          {error && (
            <div style={{
              padding: '0.6rem 0.8rem',
              borderRadius: 10,
              background: `${GOLD}14`,
              border: `1px solid ${GOLD}35`,
              color: '#f27a7a',
              fontSize: 13,
              marginBottom: '1.1rem',
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="tg-submit">
            {loading && <span className="tg-spinner" />}
            {loading ? 'Signing in' : 'Sign in'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11,
          color: '#54525a',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
        }}>
          Building software Africa trusts
        </div>
      </div>
    </div>
  )
}
