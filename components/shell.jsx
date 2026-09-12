'use client'

import Link from 'next/link'
import { SUPPORT } from '../lib/site'
import { useLocale } from './locale'

export function Mark() {
  return (
    <span className="nl-mark" aria-hidden="true">
      <span />
    </span>
  )
}

export function LangToggle() {
  const { locale, setLang } = useLocale()
  return (
    <div className="flex rounded-sm bg-sheet/80 p-0.5" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,.08)' }}>
      {['en', 'sv'].map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          className={`min-h-11 min-w-11 rounded-xs px-2.5 font-mono text-[11px] font-medium uppercase tracking-wider ${
            locale === code ? 'bg-white/10 text-ink' : 'text-muted'
          }`}
          onClick={() => setLang(code)}
        >
          {code}
        </button>
      ))}
    </div>
  )
}

export function SiteHeader() {
  const { t } = useLocale()
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-paper/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 no-underline">
          <Mark />
          <span className="leading-tight">
            <span className="block font-mono text-xs tracking-[0.3em] text-white">{t.brand.toUpperCase()}</span>
            <span className="block font-mono text-[10px] uppercase tracking-kicker text-muted">{t.product}</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Link
            href="/upload"
            className="inline-flex min-h-11 items-center rounded-sm border border-white/15 px-3.5 text-sm font-medium text-ink no-underline transition-colors hover:border-pine/50"
          >
            {t.cta}
          </Link>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  const { t } = useLocale()
  const bits = [t.footerPay, t.footerFee, t.footerPayout]
  return (
    <footer
      className="relative z-10 mt-16 border-t border-white/10 bg-black/35 px-4 py-8 sm:px-6"
      style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2.5">
          <Mark />
          <span className="font-mono text-xs tracking-[0.3em] text-white">{t.brand.toUpperCase()}</span>
        </div>
        <ul className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          {bits.map((bit, i) => (
            <li key={bit} className="flex items-center gap-2">
              {i > 0 ? <span aria-hidden="true">·</span> : null}
              <span>{bit}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
          {t.legal}{' '}
          <a className="text-ink underline underline-offset-4" href={`mailto:${SUPPORT}`}>
            {t.mail}
          </a>
        </p>
        <nav className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/terms" className="text-muted no-underline transition-colors hover:text-ink">
            {t.legalTerms}
          </Link>
          <Link href="/refunds" className="text-muted no-underline transition-colors hover:text-ink">
            {t.legalRefunds}
          </Link>
          <Link href="/privacy" className="text-muted no-underline transition-colors hover:text-ink">
            {t.legalPrivacy}
          </Link>
        </nav>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          <a href="https://www.nyttolabs.com" className="text-pine no-underline hover:opacity-80">
            www.nyttolabs.com
          </a>
        </p>
      </div>
    </footer>
  )
}

export function Frame({ children }) {
  return (
    <div className="relative min-h-dvh bg-paper text-ink">
      <div className="nl-grid" aria-hidden="true" />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
    </div>
  )
}
