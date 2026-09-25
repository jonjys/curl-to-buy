'use client'

import SellMode from '../../components/sell-mode'
import { useLocale } from '../../components/locale'

export default function UploadCopy(props) {
  const { t, locale } = useLocale()
  const sv = locale === 'sv'
  return (
    <>
      <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.live}</p>
      <h1 className="mt-2 font-display text-display font-black tracking-tight">{sv ? 'Ladda upp en fil' : 'Upload a file'}</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">{sv ? 'En mall, preset, e-bok eller leverans. Sätt ett pris och dela en länk.' : 'A template, preset, ebook or delivery. Set a price and share one link.'}</p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm font-semibold" aria-label={sv ? 'Säljverktyg' : 'Seller tools'}>
        <a href="/links" className="inline-flex min-h-11 items-center rounded-lg border border-pine/50 px-4 text-pine no-underline">{sv ? 'Mina sparade länkar →' : 'My saved links →'}</a>
      </nav>
      <div className="nl-card mt-6 rounded-2xl p-5 sm:p-7">
        <SellMode {...props} />
      </div>
    </>
  )
}

