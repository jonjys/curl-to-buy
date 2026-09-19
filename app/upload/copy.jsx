'use client'

import SellMode from '../../components/sell-mode'
import { useLocale } from '../../components/locale'

export default function UploadCopy(props) {
  const { t, locale } = useLocale()
  const sv = locale === 'sv'
  return (
    <>
      <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.live}</p>
      <h1 className="mt-2 font-display text-display font-black tracking-tight">{sv ? 'Vad vill du sälja?' : 'What would you like to sell?'}</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">{sv ? 'En hoodie, barnvagn eller digital fil – skapa en köplänk och dela den där du redan pratar med köparen.' : 'A hoodie, stroller or digital file — make a payment link and share it wherever you talk to your buyer.'}</p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm font-semibold" aria-label={sv ? 'Säljverktyg' : 'Seller tools'}>
        <a href="/links" className="inline-flex min-h-11 items-center rounded-lg border border-pine/50 px-4 text-pine no-underline">{sv ? 'Mina sparade länkar →' : 'My saved links →'}</a>
        <a href="/plans" className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-ink no-underline">{sv ? 'Se abonnemang (ej aktiva)' : 'See plans (not live)'}</a>
      </nav>
      <div className="nl-card mt-6 rounded-2xl p-5 sm:p-7">
        <SellMode {...props} />
      </div>
    </>
  )
}
