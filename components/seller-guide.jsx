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
    ['Anslut Stripe', 'Ange din e-post och fyll i de uppgifter Stripe behöver. Det görs en gång.'],
    ['Valfritt abonnemang', 'Utan abonnemang: minst $10 och 5% till Curl-to-Buy. Start €5, Grow €19 eller Scale €49 sänker minsta priset till $5 och tar bort plattformsavgiften. Stripe drar sin kortavgift i båda fallen.'],
    ['Lägg upp det du säljer', 'Välj fysisk vara eller digital fil, beskriv den och sätt priset.'],
    ['Dela köplänken', 'Skapa en unik länk och skicka den till köparen. Köparen behöver inget konto.'],
  ] : [
    ['Connect Stripe', 'Enter your email and complete the details Stripe requests. You only do this once.'],
    ['Optional subscription', 'Without a subscription: $10 minimum and 5% to Curl-to-Buy. Start €5, Grow €19 or Scale €49 lowers the minimum to $5 and removes the platform fee. Stripe deducts its card fee either way.'],
    ['List what you sell', 'Choose a physical item or digital file, describe it and set your price.'],
    ['Share your payment link', 'Create a unique link and send it to your buyer. Buyers need no account.'],
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
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{sv ? 'E-post och Stripe → Vara och pris → Dela länken. Abonnemang är valfritt.' : 'Email and Stripe → Item and price → Share the link. A subscription is optional.'}</p>
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
