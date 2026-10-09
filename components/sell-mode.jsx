'use client'

import { useEffect, useState } from 'react'
import UploadForm from './upload-form'
import ItemForm from './item-form'
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
      <p className="mb-2 text-sm font-semibold">{sv ? 'Vad säljer du?' : 'What are you selling?'}</p>
      <div className="mb-7 grid grid-cols-2 gap-2 rounded-xl border border-line bg-paper-tint p-1.5" role="tablist" aria-label={sv ? 'Vad säljer du?' : 'What are you selling?'}>
        <button type="button" role="tab" aria-selected={mode === 'digital'} onClick={() => choose('digital')} className={`min-h-14 rounded-lg px-2 text-sm font-semibold leading-tight ${mode === 'digital' ? 'bg-pine text-pine-fg' : 'text-ink'}`}>
          {sv ? 'Digital fil' : 'Digital file'}
          <span className={`block text-xs font-normal ${mode === 'digital' ? 'opacity-80' : 'text-muted'}`}>{sv ? 'Laddas ner efter köp' : 'Downloaded after purchase'}</span>
        </button>
        <button type="button" role="tab" aria-selected={mode === 'physical'} onClick={() => choose('physical')} className={`min-h-14 rounded-lg px-2 text-sm font-semibold leading-tight ${mode === 'physical' ? 'bg-pine text-pine-fg' : 'text-ink'}`}>
          {sv ? 'Fysisk vara' : 'Physical item'}
          <span className={`block text-xs font-normal ${mode === 'physical' ? 'opacity-80' : 'text-muted'}`}>{sv ? 'Du skickar den' : 'You ship it'}</span>
        </button>
      </div>
      {mode === 'physical' ? <ItemForm {...props} /> : <UploadForm {...props} />}
    </div>
  )
}
