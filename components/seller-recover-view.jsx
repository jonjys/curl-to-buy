'use client'

import { useState } from 'react'
import { useLocale } from './locale'

export default function SellerRecoverView({ invalidToken }) {
  const { t } = useLocale()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await fetch('/api/connect/recover-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Intentionally ignored: the endpoint always answers the same way.
    } finally {
      setBusy(false)
      setSent(true)
    }
  }

  return (
    <div className="nl-card rounded-2xl p-6 sm:p-8">
      <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.recoverKicker}</p>
      <h1 className="mt-2 font-display text-2xl font-bold">{t.recoverTitle}</h1>
      {invalidToken ? <p className="mt-3 text-sm text-warn">{t.recoverInvalid}</p> : null}
      {sent ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{t.recoverSent}</p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-ink-soft">{t.recoverBody}</p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-12 w-full rounded-sm border border-line bg-paper-tint px-3 text-base text-ink outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center rounded-sm bg-pine px-5 text-base font-medium text-pine-fg disabled:opacity-50"
          >
            {busy ? t.payoutChecking : t.recoverCta}
          </button>
        </form>
      )}
    </div>
  )
}
