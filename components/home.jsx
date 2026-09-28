'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { LocaleProvider, useLocale } from './locale'
import SellMode from './sell-mode'
import { SUPPORT } from '../lib/site'
import { LANDING } from './landing/copy'
import { Art, BuyCard, HeroStage, SharePreview, StepMock } from './landing/mockups'

const btnDark = 'inline-flex min-h-12 items-center justify-center rounded-full bg-[#16130f] px-6 text-base font-bold text-[#fffaf2] no-underline transition-transform hover:-translate-y-0.5'
const btnLight = 'inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#16130f] px-6 text-base font-bold text-[#16130f] no-underline transition-colors hover:bg-white'
const section = 'mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-10'

function Logo({ label }) {
  return (
    <Link href="/" aria-label={label} className="flex min-h-11 shrink-0 items-center gap-2 no-underline">
      <span aria-hidden="true" className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#16130f]">
        <span className="h-3.5 w-3.5 rounded-full bg-[var(--ctb-accent)]" />
      </span>
      <span className="text-lg font-extrabold tracking-tight max-[359px]:sr-only">Curl-to-Buy</span>
    </Link>
  )
}

function LangSwitch({ label }) {
  const { locale, setLang } = useLocale()
  return (
    <div role="group" aria-label={label} className="flex rounded-full border border-[var(--color-line)] bg-white p-0.5">
      {['en', 'sv'].map((code) => (
        <button key={code} type="button" lang={code} aria-pressed={locale === code} onClick={() => setLang(code)}
          className={`min-h-10 min-w-10 rounded-full px-2 font-mono text-xs font-medium uppercase ${locale === code ? 'bg-[#16130f] text-[#fffaf2]' : 'text-[var(--color-ink-soft)]'}`}>{code}</button>
      ))}
    </div>
  )
}

function Header({ c }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)]/70 bg-[var(--color-paper)]/90 backdrop-blur">
      <div className={`${section} flex h-16 items-center justify-between gap-2`}>
        <Logo label={c.nav.home} />
        <nav aria-label="Curl-to-Buy" className="hidden items-center gap-7 text-sm font-semibold md:flex">
          <a href="#how" className="no-underline hover:underline">{c.nav.how}</a>
          <a href="#pricing" className="no-underline hover:underline">{c.nav.pricing}</a>
          <Link href="/links" className="no-underline hover:underline">{c.nav.links}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitch label={c.nav.language} />
          <a href="#post" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-[#16130f] px-4 text-sm font-bold text-[#fffaf2] no-underline">
            <span className="sm:hidden">{c.nav.createShort}</span><span className="hidden sm:inline">{c.nav.create}</span>
          </a>
        </div>
      </div>
    </header>
  )
}

function Hero({ c }) {
  const h = c.hero
  return (
    <section className={`${section} pb-14 pt-10 sm:pt-16 lg:pb-24 lg:pt-20`}>
      <div className="max-w-5xl">
        <p className="ctb-kicker ctb-rise inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[var(--color-ink-soft)]"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--ctb-accent)]" />{h.kicker}</p>
        <h1 className="ctb-display ctb-rise mt-5" style={{ '--d': '60ms' }}>{h.title[0]} <span className="ctb-underline">{h.title[1]}</span></h1>
        <p className="ctb-rise mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-soft)] sm:text-xl" style={{ '--d': '120ms' }}>{h.lead}</p>
        <div className="ctb-rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ '--d': '180ms' }}>
          <a href="#post" className={btnDark}>{h.primary} <span aria-hidden="true" className="ml-2">→</span></a>
          <a href="#how" className={btnLight}>{h.secondary}</a>
        </div>
        <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[var(--color-ink-soft)]">
          {h.trust.map((line) => <li key={line} className="flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#16130f]" />{line}</li>)}
        </ul>
      </div>
      <div className="mt-12 lg:mt-16"><HeroStage copy={h} /></div>
    </section>
  )
}

function Demo({ c }) {
  const d = c.demo
  const [active, setActive] = useState(0)
  const tabs = useRef([])
  const example = d.examples[active]
  function onKey(event) {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    const edge = { Home: 0, End: d.examples.length - 1 }[event.key]
    if (delta == null && edge == null) return
    event.preventDefault()
    const next = edge ?? (active + delta + d.examples.length) % d.examples.length
    setActive(next)
    tabs.current[next]?.focus()
  }
  return (
    <section id="demo" className="scroll-mt-20 bg-[#16130f] py-16 text-[#fffaf2] sm:py-24">
      <div className={section}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
          <div>
            <p className="ctb-kicker text-[var(--ctb-accent)]">{d.kicker}</p>
            <h2 className="ctb-h2 mt-4">{d.title}</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#e9e1d4]">{d.lead}</p>
            <div role="tablist" aria-label={d.tabs} className="mt-8 inline-flex flex-wrap gap-2 rounded-full bg-white/10 p-1.5" onKeyDown={onKey}>
              {d.examples.map((item, i) => (
                <button key={item.id} ref={(el) => { tabs.current[i] = el }} type="button" role="tab" id={`demo-tab-${item.id}`} aria-controls="demo-panel" aria-selected={i === active} tabIndex={i === active ? 0 : -1} onClick={() => setActive(i)}
                  className={`min-h-11 rounded-full px-5 text-sm font-bold ${i === active ? 'bg-[var(--ctb-accent)] text-[#16130f]' : 'text-[#fffaf2] hover:bg-white/10'}`}>{item.tab}</button>
              ))}
            </div>
            <div className="mt-10 hidden max-w-sm lg:block">
              <p className="ctb-kicker mb-3 text-[#e9e1d4]">{d.shared}</p>
              <div className="text-[#16130f]"><SharePreview example={example} chat={d.chat} onDark /></div>
            </div>
          </div>
          <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${example.id}`} className="text-[#16130f]">
            <div className="relative mx-auto max-w-md">
              <p className="ctb-kicker mb-3 text-[#e9e1d4]">{d.page}</p>
              <div key={example.id} className="ctb-swap"><BuyCard example={example} copy={d} /></div>
              <div className="mt-8 lg:hidden">
                <p className="ctb-kicker mb-3 text-[#e9e1d4]">{d.shared}</p>
                <div><SharePreview example={example} chat={d.chat} onDark /></div>
              </div>
              <p className="mt-4 text-center text-xs text-[#cfc5b6]">{d.note}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Steps({ c }) {
  const s = c.steps
  const tints = ['var(--ctb-sky)', 'var(--ctb-butter)', 'var(--ctb-mint)']
  return (
    <section id="how" className={`${section} scroll-mt-20 py-16 sm:py-24`}>
      <p className="ctb-kicker text-[var(--color-muted)]">{s.kicker}</p>
      <h2 className="ctb-h2 mt-4 max-w-3xl">{s.title}</h2>
      <ol className="mt-12 grid gap-5 md:grid-cols-3">
        {s.items.map((step, i) => (
          <li key={step.name} className="ctb-card ctb-lift flex flex-col overflow-hidden">
            <div className="p-5 sm:p-6" style={{ background: tints[i] }}><div aria-hidden="true"><StepMock index={i} copy={s} /></div></div>
            <div className="flex flex-1 flex-col p-6">
              <p className="font-mono text-sm font-medium text-[var(--color-muted)]">0{i + 1}</p>
              <h3 className="mt-1 text-3xl font-extrabold tracking-tight">{step.name}</h3>
              <p className="mt-3 leading-relaxed text-[var(--color-ink-soft)]">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Categories({ c }) {
  const k = c.categories
  return (
    <section className={`${section} pb-16 sm:pb-24`}>
      <p className="ctb-kicker text-[var(--color-muted)]">{k.kicker}</p>
      <h2 className="ctb-h2 mt-4 max-w-4xl">{k.title}</h2>
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {k.items.map((item) => (
          <li key={item.name}>
            <a href="#post" className="ctb-card ctb-lift group flex h-full flex-col overflow-hidden no-underline">
              <div className="aspect-[16/10] overflow-hidden border-b border-[var(--color-line)]"><Art name={item.art} /></div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-2xl font-extrabold tracking-tight">{item.name}</h3>
                <p className="mt-2 flex-1 leading-relaxed text-[var(--color-ink-soft)]">{item.body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">{k.cta}<span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Why({ c }) {
  const w = c.why
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className={section}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <p className="ctb-kicker text-[var(--color-muted)]">{w.kicker}</p>
            <h2 className="ctb-h2 mt-4">{w.title}</h2>
            <p className="mt-6 max-w-md rounded-2xl bg-[var(--ctb-peach)] p-5 leading-relaxed">{w.seller}</p>
          </div>
          <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {w.items.map((item, i) => (
              <li key={item.name} className="border-t-2 border-[#16130f] pt-4">
                <p className="font-mono text-xs text-[var(--color-muted)]">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-1 text-xl font-extrabold tracking-tight">{item.name}</h3>
                <p className="mt-2 leading-relaxed text-[var(--color-ink-soft)]">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Pricing({ c }) {
  const p = c.pricing
  const card = (plan, dark, extra) => (
    <div className={`flex flex-col rounded-[1.75rem] p-7 sm:p-9 ${dark ? 'bg-[#16130f] text-[#fffaf2]' : 'ctb-card'}`}>
      <h3 className="text-xl font-extrabold">{plan.name}</h3>
      <p className="mt-6 flex items-end gap-3"><span className="text-7xl font-extrabold leading-none tracking-tighter sm:text-8xl">{plan.value}</span><span className={`pb-2 text-sm ${dark ? 'text-[#e9e1d4]' : 'text-[var(--color-muted)]'}`}>{plan.unit}</span></p>
      <ul className="mt-8 grid gap-3">
        {plan.lines.map((line) => <li key={line} className="flex items-center gap-3 font-medium"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--ctb-accent)]" />{line}</li>)}
      </ul>
      {extra}
    </div>
  )
  return (
    <section id="pricing" className={`${section} scroll-mt-20 py-16 sm:py-24`}>
      <p className="ctb-kicker text-[var(--color-muted)]">{p.kicker}</p>
      <h2 className="ctb-h2 mt-4 max-w-3xl">{p.title}</h2>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {card(p.free, false)}
        {card(p.sub, true, <Link href="/plans" className="mt-8 inline-flex min-h-11 w-fit items-center rounded-full bg-[#fffaf2] px-5 text-sm font-bold text-[#16130f] no-underline">{p.sub.link} <span aria-hidden="true" className="ml-2">→</span></Link>)}
      </div>
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[var(--color-ink-soft)]">{p.note}</p>
    </section>
  )
}

function Create({ c, stripeReady, blobReady, maxMB }) {
  const k = c.create
  return (
    <section id="post" className="scroll-mt-16 bg-[var(--ctb-sand)] py-16 sm:py-24">
      <div className={section}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="ctb-kicker text-[var(--color-muted)]">{k.kicker}</p>
            <h2 className="ctb-h2 mt-4">{k.title}</h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--color-ink-soft)]">{k.lead}</p>
            <div className="mt-8 hidden rounded-[1.5rem] bg-white/70 p-6 lg:block">
              <p className="font-bold">{k.next}</p>
              <ol className="mt-4 grid gap-4">
                {k.steps.map((line, i) => <li key={line} className="flex gap-3"><span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#16130f] text-xs font-bold text-[#fffaf2]">{i + 1}</span><span className="pt-0.5 leading-snug">{line}</span></li>)}
              </ol>
              <p className="mt-6 border-t border-[var(--color-line)] pt-4 text-sm text-[var(--color-ink-soft)]">{k.fee}</p>
              <Link href="/links" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">{k.links}</Link>
            </div>
          </div>
          <div className="ctb-card p-5 sm:p-8">
            <SellMode stripeReady={stripeReady} blobReady={blobReady} maxMB={maxMB} />
          </div>
          <div className="rounded-[1.5rem] bg-white/70 p-6 lg:hidden">
            <p className="font-bold">{k.next}</p>
            <ol className="mt-4 grid gap-3">
              {k.steps.map((line, i) => <li key={line} className="flex gap-3"><span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#16130f] text-xs font-bold text-[#fffaf2]">{i + 1}</span><span className="pt-0.5 leading-snug">{line}</span></li>)}
            </ol>
            <p className="mt-5 text-sm text-[var(--color-ink-soft)]">{k.fee}</p>
            <Link href="/links" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">{k.links}</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Final({ c }) {
  const f = c.final
  return (
    <section className={`${section} py-16 sm:py-24`}>
      <div className="relative overflow-hidden rounded-[2rem] bg-[var(--ctb-accent)] px-6 py-14 text-[#16130f] sm:px-12 sm:py-20">
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#16130f]/10 sm:h-72 sm:w-72" />
        <h2 className="ctb-h2 relative max-w-4xl">{f.title}</h2>
        <div className="relative mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href="#post" className={btnDark}>{f.button} <span aria-hidden="true" className="ml-2">→</span></a>
          <p className="max-w-md text-sm font-medium">{f.sub}</p>
        </div>
      </div>
    </section>
  )
}

function Footer({ c }) {
  const { t } = useLocale()
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-paper)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className={`${section} grid gap-8 py-12 md:grid-cols-[1.2fr_1fr]`}>
        <div>
          <Logo label={c.nav.home} />
          <p className="mt-3 text-lg font-bold">{c.footer.tagline}</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-ink-soft)]">{t.footerFee}</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-ink-soft)]">{t.legal} <a className="font-semibold underline underline-offset-4" href={`mailto:${SUPPORT}`}>{t.mail}</a></p>
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

function HomeInner({ stripeReady, blobReady, maxMB }) {
  const { locale } = useLocale()
  const c = LANDING[locale] || LANDING.en
  return (
    <div className="ctb-landing min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#16130f] focus:px-4 focus:py-3 focus:text-[#fffaf2]">{c.skip}</a>
      <Header c={c} />
      <main id="main">
        <Hero c={c} />
        <Demo c={c} />
        <Steps c={c} />
        <Categories c={c} />
        <Why c={c} />
        <Pricing c={c} />
        <Create c={c} stripeReady={stripeReady} blobReady={blobReady} maxMB={maxMB} />
        <Final c={c} />
      </main>
      <Footer c={c} />
    </div>
  )
}

export default function Home(props) {
  return <LocaleProvider><HomeInner {...props} /></LocaleProvider>
}
