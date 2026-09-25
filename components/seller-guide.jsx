'use client'

import { useEffect, useState } from 'react'
import { useLocale } from './locale'

export default function SellerGuide() {
  const { locale } = useLocale()
  const sv = locale === 'sv'
  const [connected, setConnected] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const response = await fetch('/api/connect/status', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (mounted) setConnected(Boolean(data.ready))
      } catch { /* A help panel must never block the selling flow. */ }
    }
    check()
    window.addEventListener('focus', check)
    return () => { mounted = false; window.removeEventListener('focus', check) }
  }, [])

  // Existing sellers already have a ready Stripe account; do not repeat onboarding
  // above every item form. The actual Stripe status and setup stay in the forms.
  if (connected !== false) return null

  const steps = sv ? [
    ['Anslut Stripe', 'Ange din e-post. Stripe samlar in de juridiska uppgifterna. Det görs en gång.'],
    ['Ladda upp och sätt pris', 'Lägg till filen och sätt ett pris. Curl-to-Buy tar 5 %. Ingen månadsavgift.'],
    ['Dela länken', 'Köparen betalar med kort och laddar ner filen. Pengarna går till ditt Stripe.'],
  ] : [
    ['Connect Stripe', 'Enter your email. Stripe collects the legal details. You only do this once.'],
    ['Upload and set a price', 'Add your file and set a price. Curl-to-Buy takes 5%. No monthly fee.'],
    ['Share the link', 'The buyer pays by card and downloads the file. The money goes to your Stripe.'],
  ]

  return (
    <section aria-label={sv ? 'Kom igång-guide' : 'Getting started guide'} className="mb-5 rounded-xl border border-pine/35 bg-paper-tint p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-kicker text-pine">{sv ? 'Första gången?' : 'First time here?'}</p>
          <h3 className="mt-1 text-base font-semibold">{sv ? 'Kom igång i tre steg' : 'Start selling in three steps'}</h3>
        </div>
        <button type="button" className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-xs font-semibold" aria-expanded={expanded} aria-controls="ctb-guide-steps" onClick={() => setExpanded((value) => !value)}>
          {expanded ? (sv ? 'Dölj' : 'Hide') : (sv ? 'Visa steg' : 'Show steps')}
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{sv ? 'E-post och Stripe → Fil och pris → Dela länken.' : 'Email and Stripe → File and price → Share the link.'}</p>
      {expanded ? (
        <ol id="ctb-guide-steps" className="mt-4 grid gap-2 sm:grid-cols-2">
          {steps.map(([title, description], i) => (
            <li key={title} className="rounded-lg border border-line p-3">
              <span className="font-mono text-xs font-bold text-pine">{String(i + 1).padStart(2, '0')}</span>
              <p className="mt-1 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{description}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}
