'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { MAX_FILES, MAX_MB, MAX_SALES_LIMIT } from '../lib/site'
import { FREE_MIN_USD, FREE_PRESETS, SUB_MIN_USD, SUB_PRESETS } from '../lib/entitlement'
import { formatUsd } from '../lib/copy'
import { useLocale } from './locale'

const DRAFT_KEY = 'curl-to-buy:pending-listing'
const QUANTITY_SLIDER_MAX = 1000

function sliderToQuantity(pos) {
  const ratio = pos / QUANTITY_SLIDER_MAX
  return Math.max(1, Math.min(MAX_SALES_LIMIT, Math.round(10 ** (ratio * Math.log10(MAX_SALES_LIMIT)))))
}

function quantityToSlider(value) {
  const v = Math.max(1, Math.min(MAX_SALES_LIMIT, value))
  return Math.round((Math.log10(v) / Math.log10(MAX_SALES_LIMIT)) * QUANTITY_SLIDER_MAX)
}

function readDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeDraft(draft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {}
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {}
}

export default function UploadForm({ stripeReady, blobReady, maxMB = MAX_MB }) {
  const { t, locale } = useLocale()
  const sv = locale === 'sv'
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState(String(FREE_MIN_USD))
  const [salesLimit, setSalesLimit] = useState('unlimited')
  const [downloadsPerFile, setDownloadsPerFile] = useState('3')
  const [description, setDescription] = useState('')
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('none')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [listing, setListing] = useState(null)
  const [copied, setCopied] = useState(false)
  const [drag, setDrag] = useState(false)
  const [connect, setConnect] = useState({ loading: true, hasSeller: false, ready: false, subscribed: false, minUsd: FREE_MIN_USD, presets: FREE_PRESETS, feeBps: 500 })
  const [email, setEmail] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [recover, setRecover] = useState({ mode: 'idle', email: '', code: '', busy: false, error: null })
  const finalizingRef = useRef(false)

  useEffect(() => {
    fetch('/api/connect/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => setConnect({
        loading: false,
        hasSeller: Boolean(json.hasSeller),
        ready: Boolean(json.ready),
        subscribed: Boolean(json.subscribed),
        minUsd: json.subscribed ? SUB_MIN_USD : FREE_MIN_USD,
        presets: json.subscribed ? SUB_PRESETS : FREE_PRESETS,
        feeBps: json.subscribed ? 0 : (json.feeBps || 500),
      }))
      .catch(() => setConnect((current) => ({ ...current, loading: false })))
  }, [])

  const finalizeDraft = useCallback(async (draft) => {
    if (finalizingRef.current) return
    finalizingRef.current = true
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: draft.requestId, accepted: draft.accepted, locale,
          files: draft.uploaded,
          title: draft.title,
          priceUsd: draft.priceUsd,
          salesLimit: draft.salesLimit,
          downloadsPerFile: draft.downloadsPerFile,
          description: draft.description,
          timeLimitMinutes: draft.timeLimitMinutes,
        }),
      })
      const json = await readJson(res)
      if (res.status === 402 && json.quotaExceeded) throw new Error(json.error || (sv ? 'Du har använt alla nya länkar för den här månaden.' : 'You have used all new links for this billing month.'))
      if (res.status === 402 && json.needsPlan) { window.location.assign('/plans'); return }
      if (!res.ok) throw new Error(json.error || 'Could not create the link.')
      clearDraft()
      setShowConnect(false)
      setListing(json)
    } catch (err) {
      setError(err.message || 'Could not create the link.')
    } finally {
      setBusy(false)
      finalizingRef.current = false
    }
  }, [locale, sv])

  useEffect(() => {
    if (connect.loading) return
    const draft = readDraft()
    if (!draft) return
    if (!draft.requestId || !draft.accepted) { clearDraft(); setError(t.confirmErr); return }
    if (connect.ready) {
      finalizeDraft(draft)
    } else {
      setShowConnect(true)
    }
  }, [connect.loading, connect.ready, finalizeDraft])

  useEffect(() => {
    if (connect.subscribed && price === String(FREE_MIN_USD)) setPrice(String(SUB_MIN_USD))
  }, [connect.subscribed, price])

  async function startConnect() {
    setError(null)
    setConnecting(true)
    try {
      const response = await fetch(connect.hasSeller ? '/api/billing/connect' : '/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await readJson(response)
      if (!response.ok || !json.url) throw new Error(json.error || t.connectError)
      window.location.href = json.url
    } catch (err) {
      setError(err.message || t.connectError)
      setConnecting(false)
    }
  }

  async function readJson(res) {
    const text = await res.text()
    if (!text) return {}
    try { return JSON.parse(text) } catch { return { error: text.slice(0, 200) } }
  }

  async function requestRecoveryCode() {
    setRecover((current) => ({ ...current, busy: true, error: null }))
    try {
      const res = await fetch('/api/recover/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recover.email }),
      })
      const json = await readJson(res)
      if (!res.ok) throw new Error(json.error || t.recoverError)
      setRecover((current) => ({ ...current, busy: false, mode: 'code' }))
    } catch (err) {
      setRecover((current) => ({ ...current, busy: false, error: err.message || t.recoverError }))
    }
  }

  async function verifyRecoveryCode() {
    setRecover((current) => ({ ...current, busy: true, error: null }))
    try {
      const res = await fetch('/api/recover/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recover.email, code: recover.code }),
      })
      const json = await readJson(res)
      if (!res.ok) throw new Error(json.error || t.recoverInvalidCode)
      window.location.reload()
    } catch (err) {
      setRecover((current) => ({ ...current, busy: false, error: err.message || t.recoverInvalidCode }))
    }
  }

  const minUsd = connect.subscribed ? SUB_MIN_USD : FREE_MIN_USD
  const presets = connect.subscribed ? SUB_PRESETS : FREE_PRESETS
  const usd = Number.parseFloat(price)
  const validUsd = Number.isFinite(usd) && usd >= minUsd
  const maxBytes = maxMB * 1024 * 1024
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)

  const shareUrl = useMemo(() => {
    if (!listing || typeof window === 'undefined') return ''
    return `${window.location.origin}/dl/${listing.id}`
  }, [listing])

  const onFiles = useCallback((incoming) => {
    setError(null)
    setListing(null)
    const next = Array.from(incoming || [])
    if (!next.length) return setFiles([])
    if (next.length > MAX_FILES) {
      setError(t.fileCountErr)
      return setFiles([])
    }
    if (next.reduce((sum, file) => sum + file.size, 0) > maxBytes) {
      setError(t.sizeErr)
      return setFiles([])
    }
    setFiles(next)
    if (next.length === 1 && !title) setTitle(next[0].name.replace(/\.[^.]+$/, ''))
  }, [maxBytes, t.fileCountErr, t.sizeErr, title])

  async function submit() {
    setError(null)
    if (!files.length) return setError(t.fileErr)
    if (!validUsd) return setError(connect.subscribed ? t.minErrSub : t.minErr)
    if (!accepted) return setError(t.confirmErr)
    if (!stripeReady) return setError(t.stripeDown)
    if (files.length > 1 && !blobReady) return setError(t.packageUnavailable)

    if (!blobReady) return setError(t.packageUnavailable)
    setBusy(true)
    setProgress(2)
    try {
      const batch = crypto.randomUUID()
      const uploaded = []
      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        const blob = await upload(`uploads/${batch}/${file.name}`, file, {
          access: 'public', handleUploadUrl: '/api/upload-url',
          onUploadProgress: ({ percentage }) => setProgress(Math.round(((index + percentage / 100) / files.length) * 90)),
        })
        uploaded.push({ blobPathname: blob.pathname, name: file.name, size: file.size, type: file.type })
      }
      const draft = { requestId: batch, accepted, uploaded, title, priceUsd: String(usd), salesLimit, downloadsPerFile, description, timeLimitMinutes }
      writeDraft(draft)
      if (connect.ready) await finalizeDraft(draft)
      else setShowConnect(true)
    } catch (err) { setError(err.message || 'Upload failed.') }
    finally { setBusy(false) }
  }

  async function copyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { setError('Could not copy.') }
  }

  async function shareLink() {
    if (!listing || !shareUrl) return
    const label = listing.priceUsd != null ? formatUsd(listing.priceUsd) : `${listing.priceSek} SEK`
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.name, text: `Buy “${listing.name}” for ${label}`, url: shareUrl })
        return
      } catch {}
    }
    await copyLink()
  }

  if (listing) {
    const label = listing.priceUsd != null ? formatUsd(listing.priceUsd) : `${listing.priceSek} SEK`
    return (
      <div className="space-y-5">
        <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.linkReady}</p>
        <h3 className="font-display text-3xl font-black">{listing.name}</h3>
        <p className="text-sm text-ink-soft">{label} · {listing.fileCount} {listing.fileCount === 1 ? t.oneFile : t.manyFiles}</p>
        <div className="nl-card rounded-md p-4">
          <p className="break-all font-mono text-xs text-muted">{shareUrl}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg">{copied ? t.copied : t.copy}</button>
            <button type="button" onClick={shareLink} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-cyan/40 px-4 text-sm font-medium text-cyan">{t.share}</button>
          </div>
        </div>
        <button
          type="button"
          className="text-sm text-muted underline underline-offset-4"
          onClick={() => {
            setListing(null)
            setFiles([])
            setTitle('')
            setProgress(0)
            if (inputRef.current) inputRef.current.value = ''
          }}
        >
          {t.another}
        </button>
      </div>
    )
  }

  if (showConnect) {
    return (
      <div className="space-y-4">
        <div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-kicker text-pine">{t.connectKicker}</p>
          <h3 className="mt-2 font-display text-2xl font-black">{t.connectTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t.connectText}</p>
        </div>
        {!connect.hasSeller ? (
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.email}
            className="h-12 w-full rounded-sm border border-line bg-paper-tint px-3 text-base text-ink outline-none placeholder:text-muted"
          />
        ) : null}
        {error ? <p className="text-sm text-warn">{error}</p> : null}
        <button
          type="button"
          onClick={startConnect}
          disabled={connecting || (!connect.hasSeller && !email)}
          className="inline-flex h-12 w-full items-center justify-center rounded-sm bg-pine px-5 text-base font-medium text-pine-fg disabled:opacity-50"
        >
          {connecting ? t.openingStripe : connect.hasSeller ? t.continueStripe : t.connectButton}
        </button>
        <p className="text-xs leading-relaxed text-muted">{t.connectFine}</p>

        {!connect.hasSeller && recover.mode === 'idle' ? (
          <button
            type="button"
            onClick={() => setRecover({ mode: 'email', email: '', code: '', busy: false, error: null })}
            className="text-xs text-muted underline underline-offset-4"
          >
            {t.recoverLink}
          </button>
        ) : null}

        {!connect.hasSeller && recover.mode !== 'idle' ? (
          <div className="space-y-2.5 rounded-sm border border-line bg-paper-tint p-3.5">
            <p className="text-xs font-medium text-ink">{t.recoverTitle}</p>
            {recover.mode === 'email' ? (
              <>
                <input
                  type="email"
                  value={recover.email}
                  onChange={(event) => setRecover((current) => ({ ...current, email: event.target.value }))}
                  placeholder={t.email}
                  className="h-11 w-full rounded-sm border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={requestRecoveryCode}
                  disabled={recover.busy || !recover.email}
                  className="inline-flex h-10 w-full items-center justify-center rounded-sm border border-pine/50 text-sm font-medium text-pine disabled:opacity-50"
                >
                  {recover.busy ? t.recoverSending : t.recoverSendCode}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted">{t.recoverSent}</p>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={recover.code}
                  onChange={(event) => setRecover((current) => ({ ...current, code: event.target.value.replace(/\D/g, '') }))}
                  placeholder="000000"
                  className="h-11 w-full rounded-sm border border-line bg-paper px-3 text-center text-lg tracking-[0.3em] text-ink outline-none"
                />
                <button
                  type="button"
                  onClick={verifyRecoveryCode}
                  disabled={recover.busy || recover.code.length !== 6}
                  className="inline-flex h-10 w-full items-center justify-center rounded-sm bg-pine text-sm font-medium text-pine-fg disabled:opacity-50"
                >
                  {recover.busy ? t.recoverVerifying : t.recoverVerify}
                </button>
              </>
            )}
            {recover.error ? <p className="text-xs text-warn">{recover.error}</p> : null}
            <button
              type="button"
              onClick={() => setRecover({ mode: 'idle', email: '', code: '', busy: false, error: null })}
              className="text-xs text-muted underline underline-offset-4"
            >
              {t.recoverCancel}
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-ink-soft">{sv ? 'Köparen får filerna direkt efter betalning. För kläder, ditt eget varumärke eller andra produkter som ska skickas, välj Fysisk vara.' : 'Buyers get the files after payment. For clothing, your own brand or products you ship, choose Physical item.'}</p>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t.files}</p>
        <label
          htmlFor="file"
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files) }}
          className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center ${
            drag || files.length ? 'border-pine bg-sheet' : 'border-line bg-sheet hover:border-pine/50 hover:bg-paper-tint'
          }`}
        >
          <input ref={inputRef} id="file" type="file" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
          {files.length ? (
            <div>
              <p className="font-medium">{files.length} {files.length === 1 ? t.oneFile : t.manyFiles}</p>
              <p className="mt-1 text-sm text-muted">{(totalBytes / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <>
              <p className="font-medium">{t.drop}</p>
              <p className="mt-1 text-sm text-muted">{t.dropHint}</p>
            </>
          )}
        </label>
        {files.length ? <ul className="grid gap-1 text-sm text-ink-soft">{files.map((file) => <li key={`${file.name}-${file.size}`} className="truncate">✓ {file.name}</li>)}</ul> : null}
        <details className="nl-chip rounded-md px-3.5 py-2.5 text-sm [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex items-center justify-between gap-2 font-medium text-ink">
            {t.sellListTitle}
            <span aria-hidden="true" className="text-muted">＋</span>
          </summary>
          <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            {t.sellList.map((item) => <li key={item}>· {item}</li>)}
          </ul>
          <p className="mt-3 text-xs text-muted">{t.sellListFoot}</p>
          <p className="mt-2 text-xs text-warn">{t.sellListCodeNote}</p>
        </details>
      </div>

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">{t.title}</label>
        <input id="title" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} className="h-12 w-full rounded-sm border border-line bg-paper-tint px-3 text-base text-ink outline-none placeholder:text-muted" placeholder={t.titleHint} />
      </div>

      <div className="space-y-2">
        <label htmlFor="priceUsd" className="text-sm font-medium">{t.price}</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
          <input
            id="priceUsd"
            inputMode="decimal"
            min={minUsd}
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
            className="h-12 w-full rounded-sm border border-line bg-paper-tint pl-7 pr-3 text-base text-ink outline-none placeholder:text-muted"
            placeholder={String(minUsd)}
          />
        </div>
        <input type="range" aria-label={sv ? 'Justera pris' : 'Adjust price'} min={minUsd} max={500} step={1} value={Math.min(500, validUsd ? usd : minUsd)} onChange={(e) => setPrice(e.target.value)} className="w-full accent-pine" />
        <div className="flex flex-wrap gap-2">
          {presets.map((n) => (
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
        <p className="text-sm text-muted">{connect.subscribed ? t.feeNoteSub : t.feeNote}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">{t.descriptionLabel}</label>
        <textarea
          id="description"
          value={description}
          maxLength={300}
          rows={3}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t.descriptionHint}
          className="w-full resize-none rounded-sm border border-line bg-paper-tint px-3 py-2.5 text-base text-ink outline-none placeholder:text-muted"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{t.quantityLabel}</label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={salesLimit === 'unlimited'}
              onChange={(event) => setSalesLimit(event.target.checked ? 'unlimited' : '50')}
            />
            {t.quantityUnlimited}
          </label>
        </div>
        {salesLimit !== 'unlimited' ? (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={QUANTITY_SLIDER_MAX}
              value={quantityToSlider(Number(salesLimit) || 1)}
              onChange={(event) => setSalesLimit(String(sliderToQuantity(Number(event.target.value))))}
              className="h-2 flex-1 accent-pine"
            />
            <input
              type="number"
              min={1}
              max={MAX_SALES_LIMIT}
              value={salesLimit}
              onChange={(event) => setSalesLimit(event.target.value.replace(/[^\d]/g, ''))}
              className="h-11 w-24 rounded-sm border border-line bg-paper-tint px-2 text-center text-base text-ink outline-none"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          {t.downloadLimit}
          <select value={downloadsPerFile} onChange={(event) => setDownloadsPerFile(event.target.value)} className="h-12 w-full rounded-sm border border-line bg-paper-tint px-3 text-base font-normal text-ink outline-none">
            <option value="1">1</option>
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="unlimited">{t.unlimited}</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          {t.timeLimitLabel}
          <select value={timeLimitMinutes} onChange={(event) => setTimeLimitMinutes(event.target.value)} className="h-12 w-full rounded-sm border border-line bg-paper-tint px-3 text-base font-normal text-ink outline-none">
            <option value="none">{t.timeNoLimit}</option>
            <option value="15">{t.time15m}</option>
            <option value="60">{t.time1h}</option>
            <option value="360">{t.time6h}</option>
            <option value="1440">{t.time24h}</option>
            <option value="4320">{t.time3d}</option>
          </select>
        </label>
      </div>
      <p className="text-xs leading-relaxed text-muted">{t.limitHint}</p>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-muted">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5" />
        {t.ageConfirm}
      </label>

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
        disabled={busy || !stripeReady || connect.loading}
        className="inline-flex h-12 w-full items-center justify-center rounded-sm bg-pine px-5 text-base font-medium text-pine-fg disabled:opacity-50"
      >
        {!stripeReady ? t.stripeDown : busy ? `${t.creating} ${progress}%` : t.create}
      </button>
      <p className="text-xs text-muted">{connect.subscribed ? t.feeNoteSub : t.feeNote}</p>
    </div>
  )
}

