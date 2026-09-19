'use client'

import { useEffect, useState } from 'react'
import { useLocale } from './locale'

function money(amount, currency, locale) {
  return new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-IE', {
    style: 'currency', currency,
  }).format(amount / 100)
}

export default function SubscriptionPlans() {
  const { locale } = useLocale()
  const sv = locale === 'sv'
  const [plans, setPlans] = useState([])
  const [current, setCurrent] = useState(null)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    Promise.all([
      fetch('/api/billing/plans', { cache: 'no-store' }).then(async (r) => { const body = await r.json(); if (!r.ok) throw Error(body.error); return body }),
      fetch('/api/billing/status', { cache: 'no-store' }).then(async (r) => r.ok ? r.json() : null),
    ]).then(([catalog, status]) => {
      if (!mounted) return
      setPlans(catalog.plans || [])
      setEnabled(Boolean(catalog.acceptingSubscriptions))
      setCurrent(status?.subscription || null)
    }).catch((err) => { if (mounted) setError(err.message || 'Plan pricing unavailable.') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  async function openBilling(path, body) {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      })
      const data = await response.json()
      if (!response.ok || !data.url) throw Error(data.error || 'Could not open Stripe Billing.')
      window.location.assign(data.url)
    } catch (err) { setError(err.message || 'Could not open Stripe Billing.'); setBusy(false) }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-kicker text-pine">{sv ? 'Abonnemang' : 'Subscriptions'}</p>
        <h1 className="mt-2 font-display text-3xl font-black">{sv ? 'Välj nivå för dina länkar' : 'Choose a plan for your links'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{sv ? 'Vi visar de priser och länkgränser som faktiskt finns i Stripe, inte uppskattade belopp. Abonnemangen kan inte köpas i liveversionen ännu.' : 'These are prices and link limits actually configured in Stripe, not estimates. Subscriptions cannot be purchased in production yet.'}</p>
      </div>

      <div className="rounded-xl border border-pine/40 bg-paper-tint p-4 text-sm leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">{sv ? 'Viktig avgiftsinformation' : 'Important fee information'}</p>
        <p className="mt-1">{sv ? 'Nuvarande köp har fortfarande 5 % avgift till Curl-to-Buy. Det är INTE Stripes behandlingsavgift. Stripe debiterar dessutom plattformen för kortbetalningen. Vi aktiverar inte abonnemangen förrän betalningarna migrerats så att säljaren kan stå för Stripes faktiska avgifter utan att du dubbeldebiteras.' : 'Current sales still have a 5% Curl-to-Buy service fee. This is NOT Stripe processing. Stripe also bills the platform for payment processing. Subscriptions stay unavailable until seller-paid Stripe fees and no double charging are verified.'}</p>
      </div>

      {current ? <div className="rounded-xl border border-line p-4 text-sm"><p className="font-semibold">{sv ? 'Ditt aktiva testabonnemang' : 'Your active test subscription'}: {current.plan}</p><p className="mt-1 text-muted">{sv ? 'Status' : 'Status'}: {current.status}</p>{enabled ? <button type="button" disabled={busy} onClick={() => openBilling('/api/billing/portal')} className="mt-3 min-h-11 rounded-lg border border-line px-4 font-semibold">{sv ? 'Hantera abonnemang' : 'Manage subscription'}</button> : null}</div> : null}
      {error ? <p role="alert" className="text-sm text-warn">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">{sv ? 'Hämtar priser från Stripe…' : 'Loading prices from Stripe…'}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => <article key={plan.key} className="nl-card rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-kicker text-pine">{plan.name}</p>
          <h2 className="mt-3 font-display text-3xl font-black">{money(plan.amount, plan.currency.toUpperCase(), locale)}</h2>
          <p className="mt-1 text-xs text-muted">{sv ? 'per månad' : 'per month'}</p>
          <p className="mt-4 text-sm font-semibold">{plan.monthlyLinks === null ? (sv ? 'Obegränsat antal nya länkar per månad' : 'Unlimited new links per month') : (sv ? `${plan.monthlyLinks} nya länkar per månad` : `${plan.monthlyLinks} new links per month`)}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{sv ? 'En länk kan gälla en vara eller en digital fil. Stripe-avgifter kan tillkomma per köp.' : 'One link can sell an item or a digital file. Stripe fees may apply to each sale.'}</p>
          {enabled ? <button type="button" disabled={busy || Boolean(current)} onClick={() => openBilling('/api/billing/checkout', { plan: plan.key })} className="mt-4 min-h-12 w-full rounded-lg bg-pine px-4 text-sm font-semibold text-pine-fg disabled:opacity-50">{sv ? 'Testa abonnemang i sandlådan' : 'Test subscription in sandbox'}</button> : <p className="mt-4 rounded-lg border border-line px-3 py-3 text-center text-xs font-semibold text-muted">{sv ? 'Inte tillgängligt för köp ännu' : 'Not available for purchase yet'}</p>}
        </article>)}
      </div>
      <a href="/links" className="inline-flex min-h-11 items-center text-sm text-pine underline">{sv ? 'Se mina sparade länkar →' : 'View my saved links →'}</a>
    </section>
  )
}
