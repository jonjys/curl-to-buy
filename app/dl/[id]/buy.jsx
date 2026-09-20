'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '../../../components/locale'

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
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout.')
      window.location.href = json.url
    } catch (err) { setError(err.message); setBusy(false) }
  }

  const condition = {
    new: sv ? 'Ny' : 'New',
    used_good: sv ? 'Begagnad · bra skick' : 'Used · good condition',
    used_fair: sv ? 'Begagnad · bruksskick' : 'Used · fair condition',
  }[listing.condition]

  return (
    <div className="nl-card nl-card-glow rounded-2xl p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-kicker text-pine">{isPhysical ? (sv ? 'Fysisk vara' : 'Physical item') : t.buyKicker}</p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight">{isPhysical ? (sv ? 'Köp varan' : 'Buy this item') : t.buyTitle}</h1>
      {isPhysical && listing.photoUrl ? <img src={listing.photoUrl} alt={listing.name} className="mt-5 max-h-80 w-full rounded-xl object-contain" /> : null}
      <p className="mt-5 break-words text-xl font-bold text-ink">{listing.name}</p>
      {isPhysical ? <p className="mt-1 text-sm text-muted">{condition || (sv ? 'Skick ej angivet' : 'Condition unspecified')} · {sv ? 'Frakt ingår' : 'Shipping included'}</p> : <p className="mt-1 text-sm text-muted">{listing.fileCount} {listing.fileCount === 1 ? t.oneFile : t.manyFiles}</p>}
      {listing.variant ? <p className="mt-2 text-sm text-ink-soft">{listing.variant}</p> : null}
      {listing.description ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">{listing.description}</p> : null}
      {isPhysical ? <div className="mt-4 space-y-2 text-sm text-ink-soft">{listing.brand ? <p>{listing.brand}</p> : null}<p>{sv ? 'Leverans till' : 'Ships to'}: {(listing.shippingCountries || ['SE']).join(', ')}</p>{listing.deliveryEstimate ? <p>{listing.deliveryEstimate}</p> : null}{listing.returnPolicy ? <details><summary>{sv ? 'Returinformation' : 'Return information'}</summary><p className="mt-2 whitespace-pre-wrap">{listing.returnPolicy}</p></details> : null}{listing.sellerContact ? <a href={`mailto:${listing.sellerContact}`} className="text-pine">{sv ? 'Kontakta säljaren' : 'Contact seller'}</a> : null}</div> : null}
      <p className="mt-6 font-display text-5xl font-black tabular-nums tracking-tight">{price.label}</p>
      <p className="mt-2 text-sm text-muted">{isPhysical ? (sv ? 'Betala med kort via Stripe. Ange namn, e-post och leveransadress i kassan.' : 'Pay by card via Stripe. Enter your name, email and delivery address at checkout.') : t.payCard}</p>
      {isPhysical ? <p className="mt-2 text-xs leading-relaxed text-muted">{sv ? 'Säljaren ansvarar för att skicka varan. Curl-to-Buy erbjuder inte köparskydd eller egen frakt.' : 'The seller is responsible for shipping. Curl-to-Buy does not provide buyer protection or shipping.'}</p> : null}
      {remaining != null || listing.expiresAt ? <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">{remaining != null ? <p className="text-sm font-bold text-warn">{isPhysical && remaining === 0 ? (sv ? 'Såld' : 'Sold') : `${remaining} ${t.left}`}</p> : null}{listing.expiresAt && !expired ? <p className="font-mono text-sm font-bold tabular-nums text-warn">{t.timeLeft} {formatCountdown(msLeft)}</p> : null}</div> : null}
      {listing.expiresAt && !expired ? <p className="mt-1 text-xs text-muted">{t.beFast}</p> : null}
      <button type="button" onClick={pay} disabled={busy || listing.soldOut || expired || listing.paused} className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl bg-pine px-5 text-base font-bold text-pine-fg disabled:opacity-50">{listing.paused ? (sv ? 'Länken är pausad' : 'Link paused') : listing.soldOut ? (isPhysical ? (sv ? 'Såld' : 'Sold') : t.soldOut) : expired ? t.offerExpired : busy ? t.verifying : `${isPhysical ? (sv ? 'Betala' : 'Pay') : t.pay} ${price.label}`}</button>
      {error ? <p role="alert" className="mt-3 text-sm text-warn">{error}</p> : null}
    </div>
  )
}

