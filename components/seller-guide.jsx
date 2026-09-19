'use client'

import { useEffect, useState } from 'react'
import { useLocale } from './locale'

export default function SellerGuide() {
  const { locale } = useLocale()
  const sv = locale === 'sv'
  const [connected, setConnected] = useState(null)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const response = await fetch('/api/connect/status', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (mounted) {
          setConnected(Boolean(data.ready))
          if (data.ready) setOpen(false)
        }
      } catch { /* Onboarding help should never block selling. */ }
    }
    check()
    window.addEventListener('focus', check)
    return () => { mounted = false; window.removeEventListener('focus', check) }
  }, [])

  const steps = sv ? [
    ['Välj vad du vill sälja', 'En fysisk vara eller en digital fil. Du behöver ingen webbutik.'],
    ['Anslut e-post och Stripe', 'Ange din e-postadress och slutför uppgifterna hos Stripe. Det gör du bara en gång.'],
    ['Beskriv och prissätt', 'Lägg till namn, eventuell bild och pris. Frakt ingår i priset för fysiska varor.'],
    ['Skapa och dela länken', 'Varan får automatiskt en unik köplänk. Dela den i en chatt eller på sociala medier.'],
  ] : [
    ['Choose what to sell', 'A physical item or digital file. No online store required.'],
    ['Connect email and Stripe', 'Enter your email and complete your payout details with Stripe once.'],
    ['Describe and price', 'Add a name, optional photo and price. Shipping is included for physical items.'],
    ['Create and share your link', 'Your item gets its own unique payment link. Share it in a chat or on social media.'],
  ]

  return (
    <section aria-label={sv ? 'Kom igång-guide' : 'Getting started guide'} className="mb-6 rounded-xl border border-pine/35 bg-paper-tint p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-kicker text-pine">{sv ? 'Kom igång' : 'Getting started'}</p>
          <h3 className="mt-1 text-base font-semibold">{connected ? (sv ? 'Redo för nästa köplänk' : 'Ready for your next link') : (sv ? 'Från vara till köplänk' : 'From item to payment link')}</h3>
        </div>
        <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-xs font-semibold" aria-expanded={open} aria-controls="ctb-guide-steps" onClick={() => setOpen((value) => !value)}>{open ? (sv ? 'Dölj guide' : 'Hide guide') : (sv ? 'Visa guide' : 'Show guide')}</button>
      </div>
      {open ? <ol id="ctb-guide-steps" className="mt-4 grid gap-3 sm:grid-cols-2">{steps.map(([title, description], i) => <li key={title} className="rounded-lg border border-line p-3"><span className="font-mono text-xs font-bold text-pine">{String(i + 1).padStart(2, '0')}</span><p className="mt-1 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-ink-soft">{description}</p></li>)}</ol> : null}
      <p className="mt-3 text-xs text-muted">{sv ? 'Köparen behöver inget konto. Butiksimport och abonnemang är ännu inte aktiverade.' : 'Buyers need no account. Store import and subscriptions are not enabled yet.'}</p>
    </section>
  )
}
