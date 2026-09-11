'use client'

import UploadForm from '../../components/upload-form'
import { useLocale } from '../../components/locale'

export default function UploadCopy(props) {
  const { t } = useLocale()
  return (
    <>
      <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.live}</p>
      <h1 className="mt-2 font-display text-display font-black tracking-tight">{t.uploadTitle}</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">{t.uploadLede}</p>
      <div className="nl-card mt-8 rounded-2xl p-5 sm:p-7">
        <UploadForm {...props} />
      </div>
    </>
  )
}
