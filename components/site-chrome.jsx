'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { trackEvent } from './analytics'
import { useLocale } from './locale'
import { SUPPORT } from '../lib/site'
import { LANDING } from './landing/copy'

// One header, footer and page frame for every Nytto Checkout page.
// variant: 'home' (in-page anchors), 'app' (seller and info pages), 'buyer'
// (checkout and receipt pages: no seller tools, a quiet footer).

export function useChrome() {
  const { locale } = useLocale()
  return LANDING[locale] || LANDING.en
}

export function Logo({ label }) {
  return (
    <Link href="/" aria-label={label} className="flex min-h-11 shrink-0 items-center gap-2 no-underline">
      <span aria-hidden="true" className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ink">
        <span className="h-3.5 w-3.5 rounded-full bg-accent" />
      </span>
      <span className="flex flex-col text-sm font-extrabold leading-[1.05] tracking-tight max-[359px]:sr-only min-[400px]:flex-row min-[400px]:gap-[0.3em] min-[400px]:text-lg min-[400px]:leading-normal"><span>Nytto</span><span>Checkout</span></span>
    </Link>
  )
}

export function LangSwitch({ label }) {
  const { locale, setLang } = useLocale()
  return (
    <div role="group" aria-label={label} className="flex rounded-full border border-line bg-white p-0.5">
      {['en', 'sv'].map((code) => (
        <button key={code} type="button" lang={code} aria-pressed={locale === code} onClick={() => setLang(code)}
          className={`min-h-10 min-w-10 rounded-full px-2 font-mono text-xs font-medium uppercase ${locale === code ? 'bg-ink text-pine-fg' : 'text-ink-soft hover:text-ink'}`}>{code}</button>
      ))}
    </div>
  )
}

function useCompact() {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return compact
}

export function SiteHeader({ variant = 'app' }) {
  const c = useChrome()
  const path = usePathname()
  const compact = useCompact()
  const home = variant === 'home'
  const buyer = variant === 'buyer'
  const nav = [
    { href: home ? '#how' : '/#how', label: c.nav.how },
    { href: home ? '#pricing' : '/#pricing', label: c.nav.pricing },
    { href: '/links', label: c.nav.links },
  ]
  return (
    <header className={`sticky top-0 z-50 border-b bg-paper/90 backdrop-blur ${compact ? 'border-line shadow-[0_10px_30px_-24px_rgba(22,19,15,0.45)]' : 'border-transparent'}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className={`ctb-gutter ctb-header-row mx-auto flex w-full max-w-[90rem] items-center justify-between gap-2 ${compact ? 'h-14' : 'h-16 lg:h-20'}`}>
        <Logo label={c.nav.home} />
        {buyer ? null : (
          <nav aria-label="Nytto Checkout" className="hidden items-center gap-7 text-sm font-semibold md:flex">
            {nav.map((item) => {
              const current = item.href === path
              return item.href.startsWith('/') && !item.href.startsWith('/#')
                ? <Link key={item.href} href={item.href} aria-current={current ? 'page' : undefined} className={`no-underline hover:underline ${current ? 'underline decoration-accent decoration-2 underline-offset-8' : ''}`}>{item.label}</Link>
                : <a key={item.href} href={item.href} className="no-underline hover:underline">{item.label}</a>
            })}
          </nav>
        )}
        <div className="flex items-center gap-2">
          <LangSwitch label={c.nav.language} />
          {buyer ? null : (
            <a href={home ? '#post' : '/upload'} onClick={() => trackEvent('create_link_clicked', { location: 'header' })} className="ctb-btn ctb-btn-dark min-h-11 px-4 text-sm">
              <span className="sm:hidden">{c.nav.createShort}</span><span className="hidden sm:inline">{c.nav.create}</span>
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  const c = useChrome()
  const { t } = useLocale()
  return (
    <footer className="mt-auto border-t border-line bg-paper" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="ctb-gutter mx-auto grid w-full max-w-[90rem] gap-8 py-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <Logo label={c.nav.home} />
          <p className="mt-3 text-lg font-bold">{c.footer.tagline}</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">{t.footerFee}</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">{t.legal} <a className="font-semibold underline underline-offset-4" href={`mailto:${SUPPORT}`}>{t.mail}</a></p>
        </div>
        <nav aria-label={c.footer.tagline} className="grid grid-cols-2 content-start gap-x-6 gap-y-1 text-sm font-semibold sm:grid-cols-3">
          <Link href="/links" className="inline-flex min-h-11 items-center no-underline hover:underline">{c.footer.links}</Link>
          <Link href="/plans" className="inline-flex min-h-11 items-center no-underline hover:underline">{c.footer.subscriptions}</Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center no-underline hover:underline">{t.legalTerms}</Link>
          <Link href="/refunds" className="inline-flex min-h-11 items-center no-underline hover:underline">{t.legalRefunds}</Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center no-underline hover:underline">{t.legalPrivacy}</Link>
          <a href="https://www.nyttolabs.com" className="inline-flex min-h-11 items-center no-underline hover:underline">nyttolabs.com</a>
        </nav>
      </div>
    </footer>
  )
}

// Buyers never see seller pricing or tools. The footer invites them to sell
// their own files, so every shared link also markets Nytto Checkout.
export function BuyerFooter() {
  const { t, locale } = useLocale()
  const sv = locale === 'sv'
  return (
    <footer className="mt-auto border-t border-line bg-paper py-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
      <div className="ctb-gutter mx-auto flex w-full max-w-xl flex-col gap-4">
        <Link href="/?ref=buyer" className="ctb-card ctb-lift group flex items-center justify-between gap-3 px-5 py-4 no-underline">
          <span>
            <span className="block text-sm font-bold text-ink">{sv ? 'Sälj dina egna filer' : 'Sell your own files'}</span>
            <span className="block text-xs text-muted">{sv ? 'Skapa en köplänk på en minut. Ingen månadsavgift.' : 'Create a payment link in a minute. No monthly fee.'}</span>
          </span>
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
        <nav aria-label={sv ? 'Juridik och support' : 'Legal and support'} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span>{sv ? 'Betalning via Stripe' : 'Payments by Stripe'}</span>
          <Link href="/terms" className="inline-flex min-h-9 items-center text-muted no-underline hover:text-ink">{t.legalTerms}</Link>
          <Link href="/refunds" className="inline-flex min-h-9 items-center text-muted no-underline hover:text-ink">{t.legalRefunds}</Link>
          <Link href="/privacy" className="inline-flex min-h-9 items-center text-muted no-underline hover:text-ink">{t.legalPrivacy}</Link>
          <a className="inline-flex min-h-9 items-center text-muted no-underline hover:text-ink" href={`mailto:${SUPPORT}`}>{t.mail}</a>
        </nav>
      </div>
    </footer>
  )
}

export function Frame({ children, variant = 'app' }) {
  const buyer = variant === 'buyer'
  const c = useChrome()
  return (
    <div className="ctb-landing flex min-h-dvh flex-col bg-paper text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-3 focus:text-pine-fg">{c.skip}</a>
      <SiteHeader variant={variant} />
      <div id="main" className="flex flex-1 flex-col">{children}</div>
      {buyer ? <BuyerFooter /> : <SiteFooter />}
    </div>
  )
}

// Page heading used by every inner page: small kicker, big title, short lead.
export function PageIntro({ kicker, title, lead, children }) {
  return (
    <div>
      {kicker ? <p className="ctb-kicker text-muted">{kicker}</p> : null}
      <h1 className="ctb-title mt-3">{title}</h1>
      {lead ? <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{lead}</p> : null}
      {children}
    </div>
  )
}
