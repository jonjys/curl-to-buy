'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from './locale'
import { formatUsd } from '../lib/copy'

export default function SellerView({ hasSeller, status, listings }) {
  const { t } = useLocale()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

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

  if (!hasSeller) {
    return (
      <div className="nl-card rounded-2xl p-6 sm:p-8">
        <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.sellerKicker}</p>
        <h1 className="mt-2 font-display text-2xl font-bold">{t.sellerNoneTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t.sellerNoneBody}</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg no-underline">
          {t.cta}
        </Link>
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
