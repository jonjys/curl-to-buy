'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from './locale'
import { formatUsd } from '../lib/copy'

export default function SellerView({ hasSeller, status, listings, recoveryEmail }) {
  const { t } = useLocale()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState(null)
  const [savedEmail, setSavedEmail] = useState(recoveryEmail || null)

  async function resume() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not open payout setup.')
      window.location.href = json.url
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function saveEmail(e) {
    e.preventDefault()
    setEmailBusy(true)
    setEmailError(null)
    try {
      const res = await fetch('/api/connect/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save that email.')
      setSavedEmail(json.email)
    } catch (err) {
      setEmailError(err.message)
    } finally {
      setEmailBusy(false)
    }
  }

  if (!hasSeller) {
    return (
      <div className="nl-card rounded-2xl p-6 sm:p-8">
        <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.sellerKicker}</p>
        <h1 className="mt-2 font-display text-2xl font-bold">{t.sellerNoneTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t.sellerNoneBody}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg no-underline">
            {t.cta}
          </Link>
          <Link href="/seller/recover" className="inline-flex min-h-11 items-center rounded-sm border border-white/15 px-4 text-sm font-medium text-ink no-underline">
            {t.sellerLostAccess}
          </Link>
        </div>
      </div>
    )
  }

  const ready = Boolean(status?.chargesEnabled && status?.payoutsEnabled)
  const incomplete = !ready

  return (
    <div className="space-y-6">
      <div className="nl-card rounded-2xl p-6 sm:p-8">
        <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.sellerKicker}</p>
        <h1 className="mt-2 font-display text-2xl font-bold">{t.sellerTitle}</h1>
        {ready ? (
          <div className="nl-badge mt-4 inline-flex rounded-md px-3 py-2 text-sm font-medium">{t.payoutReady}</div>
        ) : (
          <div className="mt-4 rounded-md border border-pine/30 bg-pine/5 p-4">
            <p className="text-sm leading-relaxed text-ink-soft">
              {status?.chargesEnabled ? t.sellerPayoutsPending : t.sellerIncomplete}
            </p>
            <button
              type="button"
              onClick={resume}
              disabled={busy}
              className="mt-3 inline-flex min-h-11 items-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg disabled:opacity-50"
            >
              {busy ? t.payoutChecking : t.sellerResume}
            </button>
            {error ? <p className="mt-2 text-sm text-warn">{error}</p> : null}
          </div>
        )}
      </div>

      <div className="nl-card rounded-2xl p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">{t.recoveryEmailTitle}</h2>
        {savedEmail ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {t.recoveryEmailSaved} <span className="font-medium text-ink">{maskEmail(savedEmail)}</span>
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t.recoveryEmailLede}</p>
            <form onSubmit={saveEmail} className="mt-3 flex flex-wrap gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 min-w-0 flex-1 rounded-sm border border-line bg-paper-tint px-3 text-sm text-ink outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={emailBusy}
                className="inline-flex h-11 items-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg disabled:opacity-50"
              >
                {emailBusy ? t.payoutChecking : t.recoveryEmailCta}
              </button>
            </form>
            {emailError ? <p className="mt-2 text-sm text-warn">{emailError}</p> : null}
          </>
        )}
      </div>

      {listings.length > 0 ? (
        <div className="nl-card rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold">{t.sellerListings}</h2>
          <ul className="mt-3 space-y-2">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 rounded-md border border-white/8 px-3 py-2 text-sm">
                <span className="truncate text-ink-soft">{l.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {l.priceUsd != null ? formatUsd(l.priceUsd) : `${l.priceSek} SEK`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {incomplete ? null : <p className="text-xs text-muted">{t.sellerAutoNote}</p>}
    </div>
  )
}

function maskEmail(email) {
  const [name, domain] = String(email).split('@')
  if (!domain) return email
  const visible = name.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(1, name.length - visible.length))}@${domain}`
}
