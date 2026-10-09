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
          kicker={sv ? 'Ny produkt' : 'New product'}
          title={sv ? 'Skapa din betallänk' : 'Create your payment link'}
          lead={sv ? 'Lägg till produkten, sätt priset och dela länken. Köparen betalar med kort och behöver inget konto.' : 'Add your product, set the price and share the link. Buyers pay by card and need no account.'}
        />
        <Link href="/links" className="mt-6 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">{sv ? 'Hantera dina produkter' : 'Manage your products'}</Link>
      </div>
      <div className="ctb-card p-5 sm:p-8">
        <SellMode {...props} />
      </div>
    </div>
  )
}
