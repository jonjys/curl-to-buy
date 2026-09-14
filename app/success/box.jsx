'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '../../components/locale'

export default function SuccessBox() {
  const { t } = useLocale()
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const listingId = params.get('listing_id')
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    if (!sessionId || !listingId) {
      setState({ loading: false, error: t.payFail, data: null })
      return
    }
    fetch(`/api/verify-session?listing_id=${encodeURIComponent(listingId)}&session_id=${encodeURIComponent(sessionId)}`)
      .then((response) => response.json())
      .then((json) => {
        if (json.error) setState({ loading: false, error: json.error, data: null })
        else if (json.status !== 'paid') setState({ loading: false, error: t.payFail, data: null })
        else setState({ loading: false, error: null, data: json })
      })
      .catch(() => setState({ loading: false, error: t.payFail, data: null }))
  }, [listingId, sessionId, t.payFail])

  if (state.loading) return <p className="text-sm text-muted">{t.verifying}</p>
  if (state.error) {
    return (
      <div className="nl-card rounded-2xl p-6">
        <h1 className="font-display text-3xl font-black tracking-tight">{t.payFail}</h1>
        <p className="mt-3 text-sm text-ink-soft">{state.error}</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg no-underline">{t.back}</Link>
      </div>
    )
  }

  const files = state.data.files || [{ index: 0, name: state.data.title || t.download }]
  return (
    <div className="nl-card nl-card-glow rounded-2xl p-6 sm:p-8">
      <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.successKicker}</p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight">{t.success}</h1>
      <p className="mt-3 text-sm text-ink-soft">{state.data.title}</p>
      <div className="mt-6 grid gap-2">
        {files.map((file) => (
          <a
            key={file.index}
            href={`/api/download/${state.data.file_id}?session_id=${encodeURIComponent(sessionId)}&file=${file.index}`}
            className="flex min-h-12 items-center justify-between gap-3 rounded-sm bg-pine px-5 text-sm font-semibold text-pine-fg no-underline"
          >
            <span className="min-w-0 truncate">{file.name}</span><span aria-hidden="true">↓</span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        {state.data.downloadsPerFile ? `${state.data.downloadsPerFile} ${t.downloadsEach}` : t.unlimitedDownloads}
      </p>
    </div>
  )
}
