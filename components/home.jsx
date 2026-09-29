'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { LocaleProvider, useLocale } from './locale'
import SellMode from './sell-mode'
import { Frame } from './site-chrome'
import { LANDING } from './landing/copy'
import { Art, BuyCard, HeroScene, SharePreview } from './landing/mockups'

const btnDark = 'ctb-btn ctb-btn-dark text-base'
const btnLight = 'ctb-btn ctb-btn-light text-base'
const arrow = <span aria-hidden="true" className="ctb-arrow">→</span>
const section = 'ctb-gutter mx-auto w-full max-w-[90rem]'

function Hero({ c }) {
  const h = c.hero
  return (
    <section className={`${section} overflow-x-clip pb-16 pt-8 sm:pt-12 lg:pb-24 lg:pt-6`}>
      {/* Mobile order: text, buttons, scene, then the steps. Desktop: text left, scene right. */}
      <div className="grid gap-8 lg:min-h-[calc(100svh-6rem)] lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:grid-rows-[1fr_1fr] lg:gap-x-12 lg:gap-y-0 xl:gap-x-16">
        <div className="lg:self-end">
          <p className="ctb-kicker ctb-rise inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[var(--color-ink-soft)]"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--ctb-accent)]" />{h.kicker}</p>
          <h1 className="ctb-display ctb-rise mt-5" style={{ '--d': '60ms' }}>{h.title[0]} <span className="ctb-mark">{h.title[1]}</span></h1>
          <p className="ctb-rise mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-ink-soft)] sm:text-xl" style={{ '--d': '120ms' }}>{h.lead}</p>
          <div className="ctb-rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ '--d': '180ms' }}>
            <a href="#post" className={btnDark}>{h.primary} {arrow}</a>
            <a href="#how" className={btnLight}>{h.secondary}</a>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[34rem] px-2 pt-2 sm:px-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-none lg:self-center lg:px-0 lg:pt-0"><HeroScene copy={h} /></div>
        <div className="lg:col-start-1 lg:row-start-2 lg:self-start lg:pt-8">
          <ol className="ctb-rise flex flex-wrap items-center gap-x-2 gap-y-2 text-sm font-bold" style={{ '--d': '240ms' }}>
            {h.flow.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white py-1 pl-1 pr-3"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#16130f] text-xs text-[#fffaf2]">{i + 1}</span>{step}</span>
                {i < h.flow.length - 1 ? <span aria-hidden="true" className="text-[var(--color-muted)]">→</span> : null}
              </li>
            ))}
          </ol>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-[var(--color-ink-soft)]">
            {h.trust.map((line) => <li key={line} className="flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ctb-accent)]" />{line}</li>)}
          </ul>
        </div>
      </div>
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
  return (
    <section id="how" className={`${section} scroll-mt-20 py-16 sm:py-20`}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:gap-14">
        <div>
          <p className="ctb-kicker text-[var(--color-muted)]">{s.kicker}</p>
          <h2 className="ctb-h2 mt-4">{s.title}</h2>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-[1.75rem] border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
          {s.items.map((step, i) => (
            <li key={step.name} className="bg-white p-6 sm:p-7">
              <p className="text-5xl font-extrabold leading-none tracking-tighter text-[var(--ctb-accent)]">{i + 1}</p>
              <h3 className="mt-4 text-2xl font-extrabold tracking-tight">{step.name}</h3>
              <p className="mt-2 leading-relaxed text-[var(--color-ink-soft)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Categories({ c }) {
  const k = c.categories
  const layout = [
    'sm:col-span-2 lg:col-span-2 lg:row-span-2',
    '',
    '',
    '',
    '',
    'sm:col-span-2 lg:col-span-4',
  ]
  return (
    <section className={`${section} pb-16 sm:pb-24`}>
      <p className="ctb-kicker text-[var(--color-muted)]">{k.kicker}</p>
      <h2 className="ctb-h2 mt-4 max-w-4xl">{k.title}</h2>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {k.items.map((item, i) => {
          const big = i === 0
          const wide = i === k.items.length - 1
          return (
            <li key={item.name} className={layout[i]}>
              <a href="#post" className={`ctb-card ctb-lift group flex h-full overflow-hidden no-underline ${wide ? 'flex-col sm:flex-row' : 'flex-col'}`}>
                <div className={`overflow-hidden ${big ? 'aspect-[4/3] lg:aspect-auto lg:flex-1' : wide ? 'aspect-[16/10] sm:aspect-auto sm:w-[45%] lg:w-[38%]' : 'aspect-[16/10]'}`}><Art name={item.art} /></div>
                <div className={`flex flex-1 flex-col ${big ? 'p-7' : 'p-5'} ${wide ? 'sm:justify-center sm:p-8' : ''}`}>
                  <h3 className={`${big || wide ? 'text-3xl' : 'text-xl'} font-extrabold tracking-tight`}>{item.name}</h3>
                  <p className="mt-2 flex-1 leading-relaxed text-[var(--color-ink-soft)]">{item.body}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold">{k.cta}<span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></span>
                </div>
              </a>
            </li>
          )
        })}
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
        {card(p.sub, true, <Link href="/plans" className="ctb-btn mt-8 min-h-11 w-fit bg-[#fffaf2] px-5 text-sm text-[#16130f]">{p.sub.link} {arrow}</Link>)}
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
    <section className={`${section} pb-10 pt-4 sm:pb-14`}>
      <div className="relative overflow-hidden rounded-[2rem] bg-[var(--ctb-accent)] px-6 py-14 text-[#16130f] sm:px-12 sm:py-20">
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#16130f]/10 sm:h-72 sm:w-72" />
        <h2 className="ctb-h2 relative max-w-4xl">{f.title}</h2>
        <div className="relative mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href="#post" className={btnDark}>{f.button} {arrow}</a>
          <p className="max-w-md text-sm font-medium">{f.sub}</p>
        </div>
      </div>
    </section>
  )
}

function HomeInner({ stripeReady, blobReady, maxMB }) {
  const { locale } = useLocale()
  const c = LANDING[locale] || LANDING.en
  return (
    <Frame variant="home">
      <main>
        <Hero c={c} />
        <Demo c={c} />
        <Steps c={c} />
        <Categories c={c} />
        <Why c={c} />
        <Pricing c={c} />
        <Final c={c} />
        <Create c={c} stripeReady={stripeReady} blobReady={blobReady} maxMB={maxMB} />
      </main>
    </Frame>
  )
}

export default function Home(props) {
  return <LocaleProvider><HomeInner {...props} /></LocaleProvider>
}
