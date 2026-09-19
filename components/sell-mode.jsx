'use client'

import { useEffect, useState } from 'react'
import UploadForm from './upload-form'
import ItemForm from './item-form'
import SellerGuide from './seller-guide'
import { useLocale } from './locale'

const MODE_KEY = 'curl-to-buy:sell-mode'

export default function SellMode(props) {
  const { locale } = useLocale()
  const [mode, setMode] = useState('digital')
  useEffect(() => {
    try { if (window.localStorage.getItem(MODE_KEY) === 'physical') setMode('physical') } catch {}
  }, [])
  function choose(value) {
    setMode(value)
    try { window.localStorage.setItem(MODE_KEY, value) } catch {}
  }
  const sv = locale === 'sv'
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-line bg-paper-tint p-1.5" role="tablist" aria-label={sv ? 'Vad vill du sälja?' : 'What are you selling?'}>
        <button type="button" role="tab" aria-selected={mode === 'digital'} onClick={() => choose('digital')} className={`min-h-12 rounded-lg px-2 text-sm font-semibold ${mode === 'digital' ? 'bg-pine text-pine-fg' : 'text-ink'}`}>{sv ? 'Digital fil' : 'Digital file'}</button>
        <button type="button" role="tab" aria-selected={mode === 'physical'} onClick={() => choose('physical')} className={`min-h-12 rounded-lg px-2 text-sm font-semibold ${mode === 'physical' ? 'bg-pine text-pine-fg' : 'text-ink'}`}>{sv ? 'Fysisk vara' : 'Physical item'}</button>
      </div>
      <p className="mb-6 text-xs leading-relaxed text-muted">{mode === 'physical'
        ? (sv ? 'Köparen fyller i leveransadressen i Stripe Checkout. Du ser adressen under beställningar och skickar varan själv eller via din leverantör.' : 'The buyer enters a shipping address in Stripe Checkout. You see it on the order page and ship it yourself or through your supplier.')
        : (sv ? 'Välj en eller flera filer. Efter betalning får köparen ladda ner dem här. Inget konto krävs.' : 'Pick one or more files. After payment the buyer downloads them here. No buyer account is required.')}</p>
      <SellerGuide />
      {mode === 'physical' ? <ItemForm {...props} /> : <UploadForm {...props} />}
    </div>
  )
}
