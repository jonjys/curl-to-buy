'use client'

import { LocaleProvider, useLocale } from './locale'
import { Frame } from './shell'
import UploadForm from './upload-form'
import { formatUsd, keepUsd } from '../lib/copy'
import { DEFAULT_USD } from '../lib/site'

function HomeInner({ stripeReady, blobReady, maxMB }) {
  const { t } = useLocale()
  const steps = [
    { title: t.step1t, body: t.step1 },
    { title: t.step2t, body: t.step2 },
    { title: t.step3t, body: t.step3 },
  ]
  return (
    <Frame>
      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-8 px-4 pb-6 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.kicker}</p>
            <h1 className="mt-3 font-display text-display font-black tracking-tight">
              {t.hero1}
              <br />
              {t.hero2}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">{t.lede}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {t.chips.map((chip) => (
                <li key={chip} className="nl-chip rounded-md px-3 py-1.5 text-[11px]">
                  {chip}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">{t.noAccount}</p>
            <a
              href="#post"
              className="mt-6 inline-flex min-h-12 items-center rounded-sm bg-pine px-5 text-base font-medium text-pine-fg no-underline"
            >
              {t.cta}
            </a>
          </div>
          <figure className="nl-card nl-card-glow relative overflow-hidden rounded-2xl">
            <div className="relative h-40 sm:h-48">
              <div className="nl-hero-orb" aria-hidden="true" />
            </div>
            <figcaption className="relative border-t border-white/5 bg-paper/40 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-kicker text-muted">{t.product}</p>
                <p className="nl-badge rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em]">{t.live}</p>
              </div>
              <p className="mt-4 font-display text-6xl font-black tabular-nums tracking-tight">{formatUsd(DEFAULT_USD)}</p>
              <p className="mt-2 text-sm text-ink-soft">{t.samplePay}</p>
              <p className="mt-0.5 text-sm text-muted">
                {t.sampleKeep} {formatUsd(keepUsd(DEFAULT_USD))}
              </p>
            </figcaption>
          </figure>
        </section>

        <section id="post" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-8 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="nl-card rounded-2xl p-5 sm:p-7">
              <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.live}</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{t.uploadTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t.uploadLede}</p>
              <div className="mt-6">
                <UploadForm stripeReady={stripeReady} blobReady={blobReady} maxMB={maxMB} />
              </div>
            </div>
            <ol className="grid content-start gap-3">
              {steps.map((step, i) => (
                <li key={step.title} className="nl-card rounded-2xl p-5">
                  <p className="font-mono text-xs tabular-nums text-pine">{String(i + 1).padStart(2, '0')}</p>
                  <p className="mt-1 font-display text-lg font-bold">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </Frame>
  )
}

export default function Home(props) {
  return (
    <LocaleProvider>
      <HomeInner {...props} />
    </LocaleProvider>
  )
}
