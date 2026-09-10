'use client'

import { useState } from 'react'
import { useLocale } from '../../../components/locale'

export default function BuyBox({ listing, price }) {
  const { t } = useLocale()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function pay() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/checkout/${listing.id}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout.')
      window.location.href = json.url
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg bg-sheet p-6 sm:p-8" style={{ boxShadow: '0 0 0 1px rgba(22,20,16,.06)' }}>
      <p className="text-xs font-medium uppercase tracking-kicker text-pine">{t.buyKicker}</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight">{t.buyTitle}</h1>
      <p className="mt-4 break-words text-base text-ink-soft">{listing.name}</p>
      <p className="mt-6 font-display text-5xl tabular-nums tracking-tight">{price.label}</p>
      <p className="mt-2 text-sm text-muted">{t.payCard}</p>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-sm bg-pine px-5 text-base font-medium text-pine-fg disabled:opacity-50"
      >
        {busy ? t.verifying : `${t.pay} ${price.label}`}
      </button>
      {error ? <p className="mt-3 text-sm text-warn">{error}</p> : null}
    </div>
  )
}
