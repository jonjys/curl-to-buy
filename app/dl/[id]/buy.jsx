'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '../../../components/locale'
import { visibleError } from '../../../lib/http'

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

function useCountdown(expiresAt) {
  const [msLeft, setMsLeft] = useState(() => (expiresAt ? expiresAt - Date.now() : null))
  useEffect(() => {
    if (!expiresAt) return undefined
    const tick = () => setMsLeft(expiresAt - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return msLeft
}

export default function BuyBox({ listing, price }) {
  const { t, locale } = useLocale()
  const sv = locale === 'sv'
  const isPhysical = listing.kind === 'physical'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const msLeft = useCountdown(listing.expiresAt)
  const timedOut = listing.expiresAt ? msLeft <= 0 : false
  const expired = listing.expired || timedOut
  const remaining = listing.salesLimit ? Math.max(0, listing.salesLimit - listing.sold) : null

  async function pay() {
    setError(null); setBusy(true)
    try {
      const storageKey = `ctb-checkout:${listing.id}`
      let attemptId = window.sessionStorage.getItem(storageKey)
      if (!attemptId) { attemptId = crypto.randomUUID(); window.sessionStorage.setItem(storageKey, attemptId) }
      const res = await fetch(`/api/checkout/${listing.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attemptId }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url || !/^https:\/\//.test(json.url)) throw new Error(visibleError(json.error, 'Could not start checkout.'))
      window.location.href = json.url
    } catch (err) { setError(visibleError(err.message, 'Could not start checkout.')); setBusy(false) }
  }

  const condition = {
    new: sv ? 'Ny' : 'New',
    used_good: sv ? 'Begagnad · bra skick' : 'Used · good condition',
    used_fair: sv ? 'Begagnad · bruksskick' : 'Used · fair condition',
  }[listing.condition]

  const files = listing.files || { count: 0, types: [], size: null }
  const summary = isPhysical
    ? [condition || (sv ? 'Skick ej angivet' : 'Condition unspecified'), sv ? 'Frakt ingår' : 'Shipping included']
    : [`${files.count} ${files.count === 1 ? t.oneFile : t.manyFiles}`, files.types.join(', '), files.size].filter(Boolean)
  const promises = isPhysical
    ? [
        sv ? 'Säker kortbetalning via Stripe' : 'Secure card payment via Stripe',
        `${sv ? 'Leverans till' : 'Ships to'} ${(listing.shippingCountries || ['SE']).join(', ')}`,
        listing.deliveryEstimate,
      ]
    : [
        sv ? 'Direkt nedladdning efter betalning' : 'Instant download right after payment',
        sv ? 'Säker kortbetalning via Stripe' : 'Secure card payment via Stripe',
        sv ? 'Inget konto behövs' : 'No account needed',
        listing.downloadsPerFile ? (sv ? `Ladda ner varje fil upp till ${listing.downloadsPerFile} gånger` : `Download each file up to ${listing.downloadsPerFile} times`) : null,
      ]
  const blocked = busy || listing.soldOut || expired || listing.paused
  const cta = listing.paused ? (sv ? 'Länken är pausad' : 'Link paused') : listing.soldOut ? (isPhysical ? (sv ? 'Såld' : 'Sold') : t.soldOut) : expired ? t.offerExpired : busy ? t.verifying : `${sv ? 'Köp för' : 'Buy for'} ${price.label}`

  return (
    <article className="nl-card nl-card-glow overflow-hidden rounded-2xl">
      {listing.imageUrl ? <img src={listing.imageUrl} alt={listing.name} className="max-h-96 w-full bg-paper-tint object-contain" /> : null}
      <div className="p-6 sm:p-8">
        <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{isPhysical ? (sv ? 'Fysisk vara' : 'Physical item') : (sv ? 'Digital nedladdning' : 'Digital download')}</p>
        <h1 className="mt-2 break-words font-display text-3xl font-black tracking-tight sm:text-4xl">{listing.name}</h1>
        <p className="mt-2 text-sm text-muted">{summary.join(' · ')}</p>
        {listing.variant ? <p className="mt-2 text-sm text-ink-soft">{listing.variant}</p> : null}
        {listing.description ? <p className="mt-4 whitespace-pre-wrap break-words text-base leading-relaxed text-ink-soft">{listing.description}</p> : null}

        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <p className="font-display text-5xl font-black tabular-nums tracking-tight">{price.label}</p>
          {remaining != null || listing.expiresAt ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-1">{remaining != null ? <p className="text-sm font-bold text-warn">{isPhysical && remaining === 0 ? (sv ? 'Såld' : 'Sold') : `${remaining} ${t.left}`}</p> : null}{listing.expiresAt && !expired ? <p className="font-mono text-sm font-bold tabular-nums text-warn">{t.timeLeft} {formatCountdown(msLeft)}</p> : null}</div> : null}
        </div>
        {listing.expiresAt && !expired ? <p className="mt-1 text-xs text-muted">{t.beFast}</p> : null}
        <button type="button" onClick={pay} disabled={blocked} className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-xl bg-pine px-5 text-lg font-bold text-pine-fg disabled:opacity-50">{cta}</button>
        {error ? <p role="alert" className="mt-3 text-sm text-warn">{error}</p> : null}

        <ul className="mt-5 grid gap-1.5 text-sm text-ink-soft">
          {promises.filter(Boolean).map((line) => <li key={line} className="flex gap-2"><span aria-hidden="true" className="text-pine">✓</span><span>{line}</span></li>)}
        </ul>

        {isPhysical ? (
          <div className="mt-5 space-y-2 border-t border-line/70 pt-4 text-sm text-ink-soft">
            {listing.brand ? <p>{listing.brand}</p> : null}
            {listing.returnPolicy ? <details><summary className="cursor-pointer">{sv ? 'Returinformation' : 'Return information'}</summary><p className="mt-2 whitespace-pre-wrap">{listing.returnPolicy}</p></details> : null}
            {listing.sellerContact ? <a href={`mailto:${listing.sellerContact}`} className="text-pine">{sv ? 'Kontakta säljaren' : 'Contact seller'}</a> : null}
            <p className="text-xs leading-relaxed text-muted">{sv ? 'Säljaren ansvarar för att skicka varan. Curl-to-Buy erbjuder inte köparskydd eller egen frakt.' : 'The seller is responsible for shipping. Curl-to-Buy does not provide buyer protection or shipping.'}</p>
          </div>
        ) : null}
      </div>
    </article>
  )
}
