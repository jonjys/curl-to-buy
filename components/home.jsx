'use client'

import { LocaleProvider, useLocale } from './locale'
import { Frame } from './shell'
import UploadForm from './upload-form'
import { formatUsd, keepUsd } from '../lib/copy'
import { DEFAULT_USD } from '../lib/site'

const HERO =
  'https://raw.githubusercontent.com/jonjys/curl-to-buy/main/public/images/hero.jpg'

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
            <p className="text-xs font-medium uppercase tracking-kicker text-pine">{t.kicker}</p>
            <h1 className="mt-3 font-display text-display">
              {t.hero1}
              <br />
              {t.hero2}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">{t.lede}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {t.chips.map((chip) => (
                <li
                  key={chip}
                  className="rounded-sm bg-sheet px-3 py-2 text-sm text-ink-soft"
                  style={{ boxShadow: '0 0 0 1px rgba(22,20,16,.06)' }}
                >
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
          <figure
            className="relative overflow-hidden rounded-lg bg-sheet"
            style={{ boxShadow: '0 0 0 1px rgba(22,20,16,.06)' }}
          >
            <img
              src={HERO}
              alt=""
              width={1600}
              height={900}
              className="aspect-[16/10] max-h-56 w-full object-cover sm:max-h-none sm:aspect-video"
            />
            <figcaption
              className="absolute bottom-3 left-3 right-3 rounded-md bg-sheet/95 p-4 sm:left-auto sm:right-3 sm:w-52"
              style={{ boxShadow: '0 0 0 1px rgba(22,20,16,.06)' }}
            >
              <p className="text-[11px] font-medium uppercase tracking-kicker text-muted">{t.product}</p>
              <p className="mt-2 font-display text-5xl tabular-nums tracking-tight">{formatUsd(DEFAULT_USD)}</p>
              <p className="mt-1 text-sm text-ink-soft">{t.samplePay}</p>
              <p className="mt-0.5 text-sm text-muted">
                {t.sampleKeep} {formatUsd(keepUsd(DEFAULT_USD))}
              </p>
            </figcaption>
          </figure>
        </section>

        <section id="post" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-8 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg bg-sheet p-5 sm:p-7" style={{ boxShadow: '0 0 0 1px rgba(22,20,16,.06)' }}>
              <p className="text-xs font-medium uppercase tracking-kicker text-pine">{t.live}</p>
              <h2 className="mt-2 font-display text-2xl">{t.uploadTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t.uploadLede}</p>
              <div className="mt-6">
                <UploadForm stripeReady={stripeReady} blobReady={blobReady} maxMB={maxMB} />
              </div>
            </div>
            <ol className="grid content-start gap-3">
              {steps.map((step, i) => (
                <li key={step.title} className="rounded-md bg-sheet p-5" style={{ boxShadow: '0 0 0 1px rgba(22,20,16,.06)' }}>
                  <p className="font-mono text-xs tabular-nums text-muted">{i + 1}</p>
                  <p className="mt-1 font-display text-lg">{step.title}</p>
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
