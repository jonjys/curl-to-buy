'use client'

import { useState } from 'react'
import { useLocale } from './locale'

async function readJson(res) {
  const text = await res.text()
  if (!text) return {}
  try { return JSON.parse(text) } catch { return { error: text.slice(0, 200) } }
}

export default function AccountRecover() {
  const { t } = useLocale()
  const [mode, setMode] = useState('idle')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function requestCode() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/recover/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await readJson(res)
      if (!res.ok) throw new Error(json.error || t.recoverError)
      setMode('code')
    } catch (err) {
      setError(err.message || t.recoverError)
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/recover/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const json = await readJson(res)
      if (!res.ok) throw new Error(json.error || t.recoverInvalidCode)
      window.location.reload()
    } catch (err) {
      setError(err.message || t.recoverInvalidCode)
      setBusy(false)
    }
  }

  if (mode === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setMode('email')}
        className="text-sm text-pine underline underline-offset-4"
      >
        {t.recoverLink}
      </button>
    )
  }

  return (
    <div className="space-y-2.5 rounded-lg border border-line bg-paper-tint p-4">
      <p className="text-sm font-medium text-ink">{t.recoverTitle}</p>
      {mode === 'email' ? (
        <>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.email}
            className="h-11 w-full rounded-sm border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={requestCode}
            disabled={busy || !email}
            className="inline-flex h-11 w-full items-center justify-center rounded-sm border border-pine/50 text-sm font-medium text-pine disabled:opacity-50"
          >
            {busy ? t.recoverSending : t.recoverSendCode}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted">{t.recoverSent}</p>
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="h-11 w-full rounded-sm border border-line bg-paper px-3 text-center text-lg tracking-[0.3em] text-ink outline-none"
          />
          <button
            type="button"
            onClick={verifyCode}
            disabled={busy || code.length !== 6}
            className="inline-flex h-11 w-full items-center justify-center rounded-sm bg-pine text-sm font-medium text-pine-fg disabled:opacity-50"
          >
            {busy ? t.recoverVerifying : t.recoverVerify}
          </button>
        </>
      )}
      {error ? <p className="text-xs text-warn">{error}</p> : null}
      <button
        type="button"
        onClick={() => { setMode('idle'); setEmail(''); setCode(''); setError(null) }}
        className="text-xs text-muted underline underline-offset-4"
      >
        {t.recoverCancel}
      </button>
    </div>
  )
}
