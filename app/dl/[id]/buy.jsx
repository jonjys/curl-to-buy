'use client'

import { useState } from 'react'
import { useLocale } from '../../../components/locale'

export default function BuyBox({ listing, price }) {
  const { t } = useLocale()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function pay() {
    setError(null); setBusy(true)
    try {
      const res = await fetch(`/api/checkout/${listing.id}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout.')
      window.location.href = json.url
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return <div className="nl-card nl-card-glow rounded-2xl p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-kicker text-pine">{t.buyKicker}</p><h1 className="mt-2 font-display text-3xl font-black tracking-tight">{t.buyTitle}</h1><p className="mt-5 break-words text-xl font-bold text-ink">{listing.name}</p><p className="mt-1 text-sm text-muted">{listing.fileCount} {listing.fileCount === 1 ? t.oneFile : t.manyFiles}</p><p className="mt-6 font-display text-5xl font-black tabular-nums tracking-tight">{price.label}</p><p className="mt-2 text-sm text-muted">{t.payCard}</p>{listing.salesLimit ? <p className="mt-2 text-xs text-muted">{Math.max(0, listing.salesLimit - listing.sold)} {t.left}</p> : null}<button type="button" onClick={pay} disabled={busy || listing.soldOut} className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl bg-pine px-5 text-base font-bold text-pine-fg disabled:opacity-50">{listing.soldOut ? t.soldOut : busy ? t.verifying : `${t.pay} ${price.label}`}</button>{error ? <p className="mt-3 text-sm text-warn">{error}</p> : null}</div>
}
