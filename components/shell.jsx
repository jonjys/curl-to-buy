'use client'

import Link from 'next/link'
import { SUPPORT } from '../lib/site'
import { useLocale } from './locale'

export function LangToggle() {
  const { locale, setLang } = useLocale()
  return (
    <div className="flex rounded-sm bg-sheet p-0.5" style={{ boxShadow: '0 0 0 1px rgba(22,20,16,.06)' }}>
      {['en', 'sv'].map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          className={`min-h-11 min-w-11 rounded-xs px-2.5 text-xs font-medium uppercase ${
            locale === code ? 'bg-ink text-paper' : 'text-muted'
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
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 no-underline">
          <span className="grid size-8 place-items-center rounded-sm bg-ink font-display text-sm text-paper">N</span>
          <span className="leading-tight">
            <span className="block font-display text-base tracking-tight">{t.brand}</span>
            <span className="block text-[11px] uppercase tracking-kicker text-muted">{t.product}</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Link
            href="/upload"
            className="inline-flex min-h-11 items-center rounded-sm bg-pine px-3.5 text-sm font-medium text-pine-fg no-underline"
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
    <footer className="mt-16 border-t border-line px-4 py-8 sm:px-6" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto max-w-5xl">
        <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
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
      </div>
    </footer>
  )
}

export function Frame({ children }) {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  )
}
