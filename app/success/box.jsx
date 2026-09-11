'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '../../components/locale'

export default function SuccessBox() {
  const { t } = useLocale()
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    if (!sessionId) {
      setState({ loading: false, error: t.payFail, data: null })
      return
    }
    fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setState({ loading: false, error: json.error, data: null })
        else if (json.status !== 'paid') setState({ loading: false, error: t.payFail, data: null })
        else setState({ loading: false, error: null, data: json })
      })
      .catch(() => setState({ loading: false, error: t.payFail, data: null }))
  }, [sessionId, t.payFail])

  if (state.loading) return <p className="text-sm text-muted">{t.verifying}</p>

  if (state.error) {
    return (
      <div className="nl-card rounded-2xl p-6">
        <h1 className="font-display text-3xl font-black tracking-tight">{t.payFail}</h1>
        <p className="mt-3 text-sm text-ink-soft">{state.error}</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg no-underline">
          {t.back}
        </Link>
      </div>
    )
  }

  return (
    <div className="nl-card nl-card-glow rounded-2xl p-6 sm:p-8">
      <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.successKicker}</p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight">{t.success}</h1>
      {state.data.customer_email ? (
        <p className="mt-3 text-sm text-ink-soft">{state.data.customer_email}</p>
      ) : null}
      {state.data.file_id ? (
        <a
          href={`/api/download/${state.data.file_id}?session_id=${encodeURIComponent(sessionId)}`}
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-sm bg-pine px-5 text-base font-medium text-pine-fg no-underline"
        >
          {t.download}
        </a>
      ) : null}
      <p className="mt-3 text-xs text-muted">{t.once}</p>
    </div>
  )
}
