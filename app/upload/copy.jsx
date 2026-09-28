'use client'

import Link from 'next/link'
import SellMode from '../../components/sell-mode'
import { useLocale } from '../../components/locale'
import { PageIntro } from '../../components/site-chrome'

export default function UploadCopy(props) {
  const { locale } = useLocale()
  const sv = locale === 'sv'
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <PageIntro
          kicker={sv ? 'Skapa din länk' : 'Create your link'}
          title={sv ? 'Sälj med en enda länk.' : 'Sell anything with one link.'}
          lead={sv ? 'Lägg till filen eller varan, sätt priset och få din checkout-länk. Första gången ansluter du Stripe så att pengarna kan nå dig.' : 'Add your file or item, set the price and get your checkout link. The first time, you connect Stripe so the money can reach you.'}
        />
        <Link href="/links" className="mt-6 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">{sv ? 'Hantera dina produkter' : 'Manage your products'}</Link>
      </div>
      <div className="ctb-card p-5 sm:p-8">
        <SellMode {...props} />
      </div>
    </div>
  )
}
