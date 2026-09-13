'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { DEFAULT_USD, FEE, MAX_MB, MIN_USD, PRESETS } from '../lib/site'
import { formatUsd } from '../lib/copy'
import { keepOf } from '../lib/price'
import { useLocale } from './locale'

export default function UploadForm({ stripeReady, blobReady, maxMB = MAX_MB }) {
  const { t } = useLocale()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [price, setPrice] = useState(String(DEFAULT_USD))
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [listing, setListing] = useState(null)
  const [copied, setCopied] = useState(false)
  const [drag, setDrag] = useState(false)
  const [payout, setPayout] = useState({ checking: false, ready: false, busy: false, error: null })

  async function readJson(res) {
    const text = await res.text()
    if (!text) return {}
    try {
      return JSON.parse(text)
    } catch {
      return { error: text.slice(0, 200) }
    }
  }

  const usd = Number.parseFloat(price)
  const validUsd = Number.isFinite(usd) && usd >= MIN_USD
  const keep = validUsd ? keepOf(usd) : 0
  const maxBytes = maxMB * 1024 * 1024

  const shareUrl = useMemo(() => {
    if (!listing || typeof window === 'undefined') return ''
    return `${window.location.origin}/dl/${listing.id}`
  }, [listing])

  useEffect(() => {
    if (!listing?.id) return
    let alive = true
    setPayout({ checking: true, ready: false, busy: false, error: null })
    fetch('/api/connect/status')
      .then(readJson)
      .then((j) => {
        if (alive) {
          setPayout({ checking: false, ready: Boolean(j.chargesEnabled && j.payoutsEnabled), busy: false, error: null })
        }
      })
      .catch(() => {
        if (alive) setPayout({ checking: false, ready: false, busy: false, error: null })
      })
    return () => {
      alive = false
    }
  }, [listing?.id])

  async function connectPayouts() {
    if (!listing?.id) return
    setPayout((p) => ({ ...p, busy: true, error: null }))
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id }),
      })
      const json = await readJson(res)
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start payout setup.')
      window.location.href = json.url
    } catch (err) {
      setPayout((p) => ({ ...p, busy: false, error: err.message }))
    }
  }

  const onFile = useCallback(
    (next) => {
      setError(null)
      setListing(null)
      if (!next) {
        setFile(null)
        return
      }
      if (next.size > maxBytes) {
        setError(t.sizeErr)
        setFile(null)
        return
      }
      setFile(next)
    },
    [maxBytes, t.sizeErr],
  )

  async function submit() {
    setError(null)
    if (!file) return setError(t.fileErr)
    if (!validUsd) return setError(t.minErr)
    if (!stripeReady) return setError(t.stripeDown)
    setBusy(true)
    setProgress(8)
    try {
      let created
      if (blobReady && file.size > 4 * 1024 * 1024) {
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload-url',
          onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
        })
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blobPathname: blob.pathname, name: file.name, size: file.size, priceUsd: String(usd) }),
        })
        const json = await readJson(res)
        if (!res.ok) throw new Error(json.error || 'Could not register the file.')
        created = json
      } else {
        const body = new FormData()
        body.append('file', file)
        body.append('priceUsd', String(usd))
        setProgress(45)
        const res = await fetch('/api/upload', { method: 'POST', body })
        const json = await readJson(res)
        if (!res.ok) throw new Error(json.error || 'Upload failed.')
        setProgress(100)
        created = json
      }
      setListing(created)
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Could not copy.')
    }
  }

  async function shareLink() {
    if (!listing || !shareUrl) return
    const amount = listing.priceUsd ?? listing.priceSek
    const label = listing.priceUsd != null ? formatUsd(listing.priceUsd) : `${listing.priceSek} SEK`
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.name,
          text: `Buy "${listing.name}" for ${label}`,
          url: shareUrl,
        })
        return
      } catch {}
    }
    await copyLink()
    return amount
  }

  if (listing) {
    const label = listing.priceUsd != null ? formatUsd(listing.priceUsd) : `${listing.priceSek} SEK`
    const keepLabel = listing.priceUsd != null ? formatUsd(keepOf(listing.priceUsd)) : null
    return (
      <div className="space-y-5">
        <div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.linkReady}</p>
          <p className="mt-2 font-display text-3xl font-black tabular-nums tracking-tight">{label}</p>
          <p className="mt-1 break-words text-sm text-ink-soft">{listing.name}</p>
          {keepLabel ? (
            <p className="mt-2 text-sm text-muted">
              {t.youKeep} {keepLabel} · {Math.round(FEE * 100)}%
            </p>
          ) : null}
        </div>
        {payout.ready ? (
          <div className="nl-badge rounded-md px-4 py-3 text-sm font-medium">{t.payoutReady}</div>
        ) : (
          <div className="rounded-md border border-pine/30 bg-pine/5 p-4">
            <p className="font-display text-base font-bold text-ink">{t.payoutTitle}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t.payoutLede}</p>
            <button
              type="button"
              onClick={connectPayouts}
              disabled={payout.busy || payout.checking}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg disabled:opacity-50"
            >
              {payout.checking ? t.payoutChecking : payout.busy ? t.payoutChecking : t.payoutCta}
            </button>
            {payout.error ? <p className="mt-2 text-sm text-warn">{payout.error}</p> : null}
          </div>
        )}
        <div className="nl-card rounded-md p-4">
          {payout.ready ? (
            <p className="mb-2 text-xs font-medium text-ink-soft">{t.shareHint}</p>
          ) : (
            <p className="mb-2 text-xs text-muted">{t.payoutHint}</p>
          )}
          <p className="break-all font-mono text-xs text-muted">{shareUrl}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg"
            >
              {copied ? t.copied : t.copy}
            </button>
            <button
              type="button"
              onClick={shareLink}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-sm border border-cyan/40 px-4 text-sm font-medium text-cyan"
            >
              {t.share}
            </button>
          </div>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-muted underline underline-offset-4 transition-colors hover:text-ink"
          >
            {t.test} ↗
          </a>
        </div>
        <button
          type="button"
          className="text-sm text-muted underline underline-offset-4"
          onClick={() => {
            setListing(null)
            setFile(null)
            setProgress(0)
            if (inputRef.current) inputRef.current.value = ''
          }}
        >
          {t.another}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">{t.file}</p>
        <label
          htmlFor="file"
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            onFile(e.dataTransfer.files[0] ?? null)
          }}
          className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center ${
            drag || file ? 'border-pine bg-sheet' : 'border-line bg-sheet hover:border-pine/50 hover:bg-paper-tint'
          }`}
        >
          <input
            ref={inputRef}
            id="file"
            type="file"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div>
              <p className="break-all font-medium">{file.name}</p>
              <p className="mt-1 text-sm text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <>
              <p className="font-medium">{t.drop}</p>
              <p className="mt-1 text-sm text-muted">{t.dropHint}</p>
            </>
          )}
        </label>
        <details className="nl-chip rounded-md px-3.5 py-2.5 text-sm [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex items-center justify-between gap-2 font-medium text-ink">
            {t.sellListTitle}
            <span aria-hidden="true" className="text-muted">＋</span>
          </summary>
          <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            {t.sellList.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">{t.sellListFoot}</p>
          <p className="mt-2 text-xs text-warn">{t.sellListCodeNote}</p>
        </details>
      </div>

      <div className="space-y-2">
        <label htmlFor="priceUsd" className="text-sm font-medium">
          {t.price}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
          <input
            id="priceUsd"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
            className="h-12 w-full rounded-sm border border-line bg-paper-tint pl-7 pr-3 text-base text-ink outline-none placeholder:text-muted"
            placeholder={String(DEFAULT_USD)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPrice(String(n))}
              aria-pressed={usd === n}
              className={`min-h-11 rounded-sm px-3.5 text-sm font-medium ${usd === n ? 'bg-pine text-pine-fg' : 'nl-chip text-ink'}`}
            >
              {formatUsd(n)}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{validUsd ? `${t.youKeep} ${formatUsd(keep)}` : t.minHint}</p>
      </div>

      {error ? <p className="text-sm text-warn">{error}</p> : null}

      {busy && progress > 0 && progress < 100 ? (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-paper-tint">
            <div className="h-full bg-pine" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-right text-xs text-muted">{progress}%</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={busy || !stripeReady}
        className="inline-flex h-12 w-full items-center justify-center rounded-sm bg-pine px-5 text-base font-medium text-pine-fg disabled:opacity-50"
      >
        {!stripeReady ? t.stripeDown : busy ? `${t.creating} ${progress}%` : t.create}
      </button>
      <p className="text-xs text-muted">{t.feeNote}</p>
    </div>
  )
}
