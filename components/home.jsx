'use client'

import { LocaleProvider, useLocale } from './locale'
import { Frame } from './shell'
import SellMode from './sell-mode'

function HomeInner({ stripeReady, blobReady, maxMB }) {
  const { t, locale } = useLocale()
  const sv = locale === 'sv'
  const steps = [
    { title: sv ? 'Lägg upp' : 'Post', body: sv ? 'Beskriv en sak du vill skicka eller ladda upp en digital fil. Sätt pris och skapa länken.' : 'Describe an item you can ship or upload a digital file. Set your price and create a link.' },
    { title: sv ? 'Dela länken' : 'Share', body: sv ? 'Skicka köplänken i en chatt eller på dina sociala medier. Köparen behöver inget konto.' : 'Send the link in a chat or on social media. Buyers need no account.' },
    { title: sv ? 'Få betalt' : 'Get paid', body: sv ? 'Stripe tar betalningen och delar beloppet med säljaren. För fysiska varor ansvarar säljaren för leverans.' : 'Stripe processes payment and allocates seller proceeds. For physical items, the seller handles delivery.' },
  ]
  return (
    <Frame>
      <main>
        <section className="mx-auto grid w-full max-w-7xl items-stretch gap-8 px-4 pb-6 pt-7 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-12 lg:px-8">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{sv ? 'Filer och prylar. En köplänk.' : 'Files and items. One payment link.'}</p>
            <h1 className="mt-3 font-display text-display font-black tracking-tight">{sv ? 'Lägg upp en vara.' : 'Post an item.'}<br />{t.hero2}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{sv ? 'En hoodie, barnvagn, guide eller ett helt filpaket. Skapa en egen länk, dela den i en chatt och låt köparen betala tryggt med kort via Stripe.' : 'A hoodie, stroller, guide or file bundle. Make a link, share it in a chat and let buyers pay by card through Stripe.'}</p>
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
              {(sv ? ['Fysiska varor', 'Digitala filer', 'Kort via Stripe', 'Inget köparkonto'] : ['Physical items', 'Digital files', 'Cards via Stripe', 'No buyer account']).map((chip) => <li key={chip} className="nl-chip rounded-md px-2.5 py-1 text-[11px]">{chip}</li>)}
            </ul>
            <p className="mt-3 max-w-2xl text-sm text-muted">{sv ? 'Utan abonnemang: minst $10 och 5% till Curl-to-Buy. Med Start/Grow/Scale: minst $5 och ingen plattformsprocent. Köpare behöver inget konto.' : 'Without a subscription: $10 minimum and 5% to Curl-to-Buy. With Start/Grow/Scale: $5 minimum and no platform percentage. Buyers need no account.'}</p>
            <a href="#post" className="mt-6 inline-flex min-h-12 items-center rounded-sm bg-pine px-5 text-base font-medium text-pine-fg no-underline">{sv ? 'Skapa en köplänk' : 'Create a payment link'}</a>
          </div>
          <figure className="nl-card nl-card-glow relative flex min-h-[22rem] flex-col overflow-hidden rounded-2xl lg:min-h-full">
            <div className="relative min-h-36 flex-1 sm:min-h-44"><div className="nl-hero-orb" aria-hidden="true" /></div>
            <figcaption className="relative border-t border-line/70 bg-paper/50 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-kicker text-muted">{sv ? 'Exempel: digital fil' : 'Example: digital file'}</p><p className="nl-badge rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em]">{t.live}</p></div>
              <p className="mt-4 font-display text-5xl font-black tracking-tight sm:text-6xl">{sv ? 'Ditt pris' : 'Your price'}</p>
              <p className="mt-2 text-sm text-ink-soft">{t.samplePay}</p>
              <p className="mt-0.5 text-sm text-muted">{sv ? 'Du sätter priset. Stripe drar sin betalningsavgift.' : 'You set the price. Stripe deducts its processing fee.'}</p>
            </figcaption>
          </figure>
        </section>
        <section id="post" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:gap-8">
            <div className="nl-card rounded-2xl p-5 sm:p-7">
              <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.live}</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{sv ? 'Vad vill du sälja?' : 'What are you selling?'}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{sv ? 'En länk för en fysisk vara eller en nedladdningsbar fil.' : 'One link for a physical item or a downloadable file.'}</p>
              <div className="mt-6"><SellMode stripeReady={stripeReady} blobReady={blobReady} maxMB={maxMB} /></div>
            </div>
            <aside className="nl-card flex flex-col justify-between rounded-2xl p-6 sm:p-7">
              <div>
                <h2 className="font-display text-2xl font-bold">{sv ? 'För din nästa produkt eller hela ditt varumärke' : 'For your next product or your whole brand'}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{sv ? 'Samma länk fungerar i din bio, i en chatt och som köpknapp på din webbplats. Välj ett abonnemang för dina länkar. För fysiska varor samlar Stripe in leveransadressen och du hittar beställningen under Mina länkar.' : 'Use the same link in your bio, in a chat or as a buy button on your website. Choose a subscription for your links. For physical products, Stripe collects the delivery address and you find the order under My links.'}</p>
              </div>
              <a href="/plans" className="mt-6 inline-flex min-h-11 w-fit items-center rounded-lg bg-pine px-4 font-semibold text-pine-fg no-underline">{sv ? 'Se abonnemang' : 'View subscriptions'}</a>
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
