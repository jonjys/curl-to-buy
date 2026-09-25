'use client'

import { LocaleProvider, useLocale } from './locale'
import { Frame } from './shell'
import SellMode from './sell-mode'

function HomeInner({ stripeReady, blobReady, maxMB }) {
  const { t, locale } = useLocale()
  const sv = locale === 'sv'
  const steps = [
    { title: sv ? 'Ladda upp' : 'Upload', body: sv ? 'Lägg till filen du säljer: en mall, en preset, en e-bok eller en leverans.' : 'Add the file you sell: a template, preset, ebook or delivery.' },
    { title: sv ? 'Pris' : 'Price', body: sv ? 'Sätt ett pris i dollar och dela en länk.' : 'Set a dollar price and share one link.' },
    { title: sv ? 'Få betalt' : 'Get paid', body: sv ? 'Köparen betalar med kort. Pengarna går till ditt Stripe.' : 'The buyer pays by card. The money goes to your Stripe.' },
  ]
  return (
    <Frame>
      <main>
        <section className="mx-auto grid w-full max-w-7xl items-stretch gap-8 px-4 pb-6 pt-7 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-12 lg:px-8">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{sv ? 'För frilansare. En köplänk.' : 'For freelancers. One payment link.'}</p>
            <h1 className="mt-3 font-display text-display font-black tracking-tight">{sv ? 'Sälj en fil.' : 'Sell a file.'}<br />{t.hero2}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{sv ? 'Ladda upp en mall, en preset, en e-bok eller en leverans. Sätt ett pris och dela en länk. Köparen betalar med kort, och pengarna går till ditt Stripe. 5 % i avgift. Ingen månadsavgift.' : 'Upload a template, preset, ebook or client delivery. Set a price and share one link. The buyer pays by card, and the money goes to your Stripe. 5% fee. No monthly fee.'}</p>
            <ol className="mt-6 grid gap-2 sm:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="nl-card rounded-xl px-3.5 py-3">
                  <p className="font-mono text-[10px] tabular-nums text-pine">{String(i + 1).padStart(2, '0')}</p>
                  <p className="mt-1 font-display text-base font-bold">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {(sv ? ['Mallar', 'Presets', 'E-böcker', 'Leveranser'] : ['Templates', 'Presets', 'Ebooks', 'Deliverables']).map((chip) => <li key={chip} className="nl-chip rounded-md px-2.5 py-1 text-[11px]">{chip}</li>)}
            </ul>
            <p className="mt-3 max-w-2xl text-sm text-muted">{sv ? 'Minst $10. 5 % till Curl-to-Buy. Ingen månadsavgift. Köparen behöver inget konto.' : '$10 minimum. 5% to Curl-to-Buy. No monthly fee. Buyers need no account.'}</p>
            <a href="#post" className="mt-6 inline-flex min-h-12 items-center rounded-sm bg-pine px-5 text-base font-medium text-pine-fg no-underline">{sv ? 'Skapa en köplänk' : 'Create a payment link'}</a>
          </div>
          <figure className="nl-card nl-card-glow relative flex min-h-[22rem] flex-col overflow-hidden rounded-2xl lg:min-h-full">
            <div className="relative min-h-36 flex-1 sm:min-h-44"><div className="nl-hero-orb" aria-hidden="true" /></div>
            <figcaption className="relative border-t border-line/70 bg-paper/50 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-kicker text-muted">{sv ? 'Exempel: digital fil' : 'Example: digital file'}</p><p className="nl-badge rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em]">{t.live}</p></div>
              <p className="mt-4 font-display text-5xl font-black tracking-tight sm:text-6xl">{sv ? 'Ditt pris' : 'Your price'}</p>
              <p className="mt-2 text-sm text-ink-soft">{t.samplePay}</p>
              <p className="mt-0.5 text-sm text-muted">{sv ? 'Du sätter priset. Curl-to-Buy tar 5 %. Stripe drar sin kortavgift.' : 'You set the price. Curl-to-Buy takes 5%. Stripe deducts its card fee.'}</p>
            </figcaption>
          </figure>
        </section>
        <section id="post" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:gap-8">
            <div className="nl-card rounded-2xl p-5 sm:p-7">
              <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.live}</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{sv ? 'Ladda upp en fil' : 'Upload a file'}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{sv ? 'Sätt ett pris och dela en länk. Köparen betalar med kort och laddar ner filen.' : 'Set a price and share one link. The buyer pays by card and downloads the file.'}</p>
              <div className="mt-6"><SellMode stripeReady={stripeReady} blobReady={blobReady} maxMB={maxMB} /></div>
            </div>
            <aside className="nl-card flex flex-col justify-between rounded-2xl p-6 sm:p-7">
              <div>
                <h2 className="font-display text-2xl font-bold">{sv ? 'En länk för frilansfiler' : 'One link for freelance files'}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{sv ? 'Mallar, presets, e-böcker och leveranser. Dela länken i en chatt, en bio eller på din webbplats. Pengarna går till ditt Stripe.' : 'Templates, presets, ebooks and client deliveries. Share the link in a chat, a bio or on your site. The money goes to your Stripe.'}</p>
              </div>
              <a href="#post" className="mt-6 inline-flex min-h-11 w-fit items-center rounded-lg bg-pine px-4 font-semibold text-pine-fg no-underline">{sv ? 'Skapa en köplänk' : 'Create a payment link'}</a>
            </aside>
          </div>
        </section>
      </main>
    </Frame>
  )
}

export default function Home(props) {
  return <LocaleProvider><HomeInner {...props} /></LocaleProvider>
}
