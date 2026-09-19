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
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-line bg-paper-tint p-1.5" role="tablist" aria-label={sv ? 'Vad vill du sälja?' : 'What are you selling?'}>
        <button type="button" role="tab" aria-selected={mode === 'digital'} onClick={() => choose('digital')} className={`min-h-12 rounded-lg px-2 text-sm font-semibold ${mode === 'digital' ? 'bg-pine text-pine-fg' : 'text-ink'}`}>{sv ? 'Digital fil' : 'Digital file'}</button>
        <button type="button" role="tab" aria-selected={mode === 'physical'} onClick={() => choose('physical')} className={`min-h-12 rounded-lg px-2 text-sm font-semibold ${mode === 'physical' ? 'bg-pine text-pine-fg' : 'text-ink'}`}>{sv ? 'Fysisk vara' : 'Physical item'}</button>
      </div>
      <SellerGuide />
      {mode === 'physical' ? <ItemForm {...props} /> : <UploadForm {...props} />}
    </div>
  )
}
