'use client'

import { useEffect, useState } from 'react'
import { useLocale } from './locale'

function money(amount, currency, locale) {
  return new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-IE', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(amount / 100)
}

export default function SubscriptionPlans() {
  const { locale } = useLocale()
  const sv = locale === 'sv'
  const [plans, setPlans] = useState([])
  const [status, setStatus] = useState(null)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [chosen, setChosen] = useState(null)

  useEffect(() => {
    let mounted = true
    Promise.all([
      fetch('/api/billing/plans', { cache: 'no-store' }).then(async (r) => { const body = await r.json(); if (!r.ok) throw Error('catalog'); return body }),
      fetch('/api/billing/status', { cache: 'no-store' }).then(async (r) => r.ok ? r.json() : null),
    ]).then(([catalog, account]) => {
      if (!mounted) return
      setPlans(catalog.plans || [])
      setEnabled(Boolean(catalog.acceptingSubscriptions))
      setStatus(account)
      try { setChosen(window.localStorage.getItem('ctb:selected-plan')) } catch {}
    }).catch(() => { if (mounted) setError(sv ? 'Priserna kunde inte hämtas. Försök igen om en stund.' : 'Prices could not be loaded. Please try again shortly.') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [sv])

  async function openBilling(path, body = {}) {
    setBusy(true); setError('')
    try {
      const response = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || !data.url) throw Error(data.error || 'Could not open Stripe.')
      window.location.assign(data.url)
    } catch (err) { setError(err.message); setBusy(false) }
  }

  function choose(plan) {
    setChosen(plan)
    try { window.localStorage.setItem('ctb:selected-plan', plan) } catch {}
    if (status?.merchantReady) openBilling('/api/billing/checkout', { plan })
  }

  const current = status?.subscription
  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-kicker text-pine">{sv ? 'Abonnemang' : 'Subscriptions'}</p>
        <h1 className="mt-2 font-display text-3xl font-black">{sv ? 'Dina produkter. Dina länkar.' : 'Your products. Your links.'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{sv ? 'Sälj fysiska produkter, ditt eget varumärke och digitala filer. Välj hur många nya köplänkar du behöver varje månad.' : 'Sell physical products, your own brand and digital files. Choose how many new payment links you need each month.'}</p>
        <p className="mt-3 text-sm text-muted">{sv ? 'Du betalar abonnemanget till Nytto Labs. Curl-to-Buy tar ingen procent på varje försäljning. Stripe drar sin kortavgift från beloppet som landar hos dig.' : 'You pay the subscription to Nytto Labs. Curl-to-Buy takes no percentage of each sale. Stripe deducts its card fee from the amount that reaches you.'}</p>
      </div>
      {current ? <div className="nl-card rounded-xl p-5 text-sm">
        <p className="font-semibold">{current.name || current.plan}</p>
        {current.status !== 'active' ? <p role="status" className="mt-2 text-warn">{sv ? 'Abonnemanget är inte aktivt. Hantera betalningen nedan.' : 'Your subscription is not active. Manage your payment below.'}</p> : null}
        <p className="mt-2 text-muted">{current.used} / {current.monthlyLinks ?? '∞'} {sv ? 'nya länkar denna period' : 'new links this period'}</p>
        <p className="mt-2 text-muted">{current.cancelAtPeriodEnd ? (sv ? 'Avslutas' : 'Ends') : (sv ? 'Förnyas' : 'Renews')} {new Date(current.periodEnd * 1000).toLocaleDateString(sv ? 'sv-SE' : 'en-GB')}</p>
        <button type="button" disabled={busy} onClick={() => openBilling('/api/billing/portal')} className="mt-4 min-h-11 rounded-lg border border-line px-4 font-semibold">{sv ? 'Byt nivå eller hantera abonnemang' : 'Change plan or manage subscription'}</button>
        <a href="/upload" className="ml-4 inline-flex min-h-11 items-center text-pine">{sv ? 'Fortsätt med din länk' : 'Continue your link'}</a>
      </div> : null}
      {error ? <p role="alert" className="text-sm text-warn">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">{sv ? 'Hämtar abonnemang…' : 'Loading subscriptions…'}</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => <article key={plan.key} className={`nl-card rounded-xl p-5 ${chosen === plan.key ? 'border-pine' : ''}`}>
          <p className="font-mono text-xs uppercase tracking-kicker text-pine">{plan.name}</p>
          <h2 className="mt-3 font-display text-3xl font-black">{money(plan.amount, plan.currency.toUpperCase(), locale)}</h2>
          <p className="mt-1 text-xs text-muted">{sv ? 'per månad, inklusive moms där tillämpligt' : 'per month, including applicable tax'}</p>
          <p className="mt-4 text-sm font-semibold">{plan.monthlyLinks === null ? (sv ? 'Obegränsat antal nya länkar' : 'Unlimited new links') : (sv ? `${plan.monthlyLinks} nya länkar per månad` : `${plan.monthlyLinks} new links per month`)}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{sv ? 'En länk kan ta emot flera köp. Du bestämmer pris och lagerantal.' : 'A link can receive multiple purchases. You choose the price and stock quantity.'}</p>
          <button type="button" disabled={busy || !enabled || Boolean(current)} onClick={() => choose(plan.key)} className="mt-5 min-h-12 w-full rounded-lg bg-pine px-4 text-sm font-semibold text-pine-fg disabled:opacity-50">{current?.plan === plan.key ? (sv ? 'Ditt abonnemang' : 'Your plan') : (sv ? `Välj ${plan.name}` : `Choose ${plan.name}`)}</button>
        </article>)}
      </div>
      {!loading && plans.length > 0 && !enabled ? <p role="status" className="text-sm text-muted">{sv ? 'Priserna visas, men nya abonnemang är inte öppna i den här miljön ännu. Ingen betalning tas innan du bekräftar i Stripe.' : 'Prices are shown, but new subscriptions are not open in this environment yet. No payment is taken until you confirm in Stripe.'}</p> : null}
      {chosen && !current && enabled ? <div className="nl-card space-y-3 rounded-xl p-5">
        <h2 className="font-semibold">{status?.merchantReady ? (sv ? 'Fortsätt med ditt abonnemang' : 'Continue with your subscription') : (sv ? 'Anslut betalningar hos Stripe' : 'Connect payments with Stripe')}</h2>
        {!status?.merchantReady ? <p className="text-sm leading-relaxed text-ink-soft">{sv ? 'Stripe verifierar säljaren och bankkontot. Har du en äldre anslutning kan Stripe behöva uppdatera din setup för abonnemang. Dina tidigare länkar och köp finns kvar.' : 'Stripe verifies the seller and bank account. An older connection may need an updated setup for subscriptions. Your existing links and purchases remain available.'}</p> : null}
        {!status?.authenticated ? <><label className="block text-sm">{sv ? 'Din e-postadress' : 'Your email'}<input type="email" autoComplete="email" className="mt-2 h-12 w-full rounded-lg border border-line bg-paper-tint px-3" value={email} onChange={(e) => setEmail(e.target.value)} /></label><a href="/upload" className="block text-xs text-pine">{sv ? 'Redan säljare? Återställ via e-post på sidan Skapa köplänk.' : 'Already selling? Recover by email on the Create link page.'}</a></> : null}
        <button type="button" disabled={busy || (!status?.authenticated && !email)} onClick={() => status?.merchantReady ? openBilling('/api/billing/checkout', { plan: chosen }) : openBilling(status?.authenticated ? '/api/billing/connect' : '/api/connect', { email })} className="min-h-12 rounded-lg bg-pine px-5 font-semibold text-pine-fg disabled:opacity-50">{sv ? 'Fortsätt till Stripe' : 'Continue to Stripe'}</button>
      </div> : null}
      <div className="space-y-2 text-sm leading-relaxed text-muted"><p>{sv ? 'Alla nivåer inkluderar digital leverans, leveransadress för fysiska varor och sparade länkar. Avsluta före nästa förnyelse; abonnemanget fungerar till den betalda periodens slut.' : 'All plans include digital delivery, shipping address collection for physical products and saved links. Cancel before the next renewal; access continues until the paid period ends.'}</p><p>{sv ? 'Försäljningarna sker via din köplänk. Du sköter leveransen; detta synkar inte lager eller order med Shopify.' : 'Sales take place through your payment link. You handle fulfillment; stock and orders do not sync with Shopify.'}</p></div>
      <a href="/links" className="inline-flex min-h-11 items-center text-sm text-pine underline">{sv ? 'Mina sparade länkar' : 'My saved links'}</a>
    </section>
  )
}
