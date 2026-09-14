'use client'

import Link from 'next/link'
import { SUPPORT } from '../lib/site'
import { useLocale } from './locale'

export function Mark() {
  return <span className="nl-mark" aria-hidden="true"><span /></span>
}

export function LangToggle() {
  const { locale, setLang } = useLocale()
  return <div className="flex rounded-lg border border-line bg-sheet p-0.5">{['en', 'sv'].map((code) => <button key={code} type="button" aria-pressed={locale === code} className={`min-h-10 min-w-10 rounded-md px-2 text-xs font-bold uppercase ${locale === code ? 'bg-paper text-ink' : 'text-muted'}`} onClick={() => setLang(code)}>{code}</button>)}</div>
}

export function SiteHeader() {
  const { t } = useLocale()
  return <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md"><div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6"><Link href="/" className="flex min-h-11 items-center gap-2.5 no-underline"><Mark /><span className="font-display text-base font-black tracking-tight text-ink">{t.brand}</span></Link><div className="flex items-center gap-2"><LangToggle /><Link href="/upload" className="inline-flex min-h-11 items-center rounded-lg bg-pine px-3.5 text-sm font-bold text-pine-fg no-underline">{t.cta}</Link></div></div></header>
}

export function SiteFooter() {
  const { t } = useLocale()
  return <footer className="relative z-10 mt-16 border-t border-line bg-sheet px-4 py-8 sm:px-6"><div className="mx-auto max-w-5xl"><div className="flex items-center gap-2.5"><Mark /><span className="font-display font-black text-ink">{t.brand}</span></div><p className="mt-3 max-w-xl text-sm text-ink-soft">{t.legal} <a className="underline" href={`mailto:${SUPPORT}`}>{t.mail}</a></p><nav className="mt-4 flex gap-4 text-sm"><Link href="/terms" className="text-muted no-underline">{t.legalTerms}</Link><Link href="/refunds" className="text-muted no-underline">{t.legalRefunds}</Link><Link href="/privacy" className="text-muted no-underline">{t.legalPrivacy}</Link></nav><p className="mt-4 text-xs text-muted">By <a href="https://www.nyttolabs.com" className="font-semibold text-ink">Nytto Labs</a></p></div></footer>
}

export function Frame({ children }) {
  return <div className="relative min-h-dvh bg-paper text-ink"><div className="nl-grid" aria-hidden="true" /><div className="relative z-10 flex min-h-dvh flex-col"><SiteHeader />{children}<SiteFooter /></div></div>
}
