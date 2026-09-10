'use client'

import UploadForm from '../../components/upload-form'
import { useLocale } from '../../components/locale'

export default function UploadCopy(props) {
  const { t } = useLocale()
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-kicker text-pine">{t.live}</p>
      <h1 className="mt-2 font-display text-display">{t.uploadTitle}</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">{t.uploadLede}</p>
      <div className="mt-8 rounded-lg bg-sheet p-5 sm:p-7" style={{ boxShadow: '0 0 0 1px rgba(22,20,16,.06)' }}>
        <UploadForm {...props} />
      </div>
    </>
  )
}
