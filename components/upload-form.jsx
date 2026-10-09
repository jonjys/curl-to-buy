'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { MAX_FILES, MAX_MB, MAX_SALES_LIMIT, onboardingNotice } from '../lib/site'
import { visibleError } from '../lib/http'
import { FREE_MIN_SEK, FREE_MIN_USD, FREE_PRESETS, SUB_MIN_SEK, SUB_MIN_USD, SUB_PRESETS } from '../lib/entitlement'
import { formatMoney, saleSplit } from '../lib/fee-math'
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '../lib/public-image'
import { cleanImage } from '../lib/clean-image'
import { useLocale } from './locale'
import { storedSource, trackEvent } from './analytics'
import UseAnywhere from './use-anywhere'

const DRAFT_KEY = 'curl-to-buy:pending-listing'
// Kronor presets mirror the dollar ones: the free plan starts at 100 kr, a subscription at 50 kr.
const SEK_PRESETS = Object.freeze([100, 150, 299])
const SEK_PRESETS_SUB = Object.freeze([50, 99, 299])
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
  const [currency, setCurrency] = useState('usd')
  const [price, setPrice] = useState(String(FREE_MIN_USD))
  const currencyChosen = useRef(false)
  const [salesLimit, setSalesLimit] = useState('unlimited')
  const [downloadsPerFile, setDownloadsPerFile] = useState('3')
  const [description, setDescription] = useState('')
  const [cover, setCover] = useState(null)
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
  const [connectError, setConnectError] = useState(null)
  const [showConnect, setShowConnect] = useState(false)
  const [recover, setRecover] = useState({ mode: 'idle', email: '', code: '', busy: false, error: null })
  const finalizingRef = useRef(false)

  useEffect(() => {
    fetch('/api/connect/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => {
        const hasSeller = Boolean(json.hasSeller)
        const ready = Boolean(json.ready)
        setConnect({
          loading: false,
          hasSeller,
          ready,
          subscribed: Boolean(json.subscribed),
          minUsd: json.subscribed ? SUB_MIN_USD : FREE_MIN_USD,
          presets: json.subscribed ? SUB_PRESETS : FREE_PRESETS,
          feeBps: json.subscribed ? 0 : (json.feeBps || 500),
        })
        const notice = onboardingNotice(new URLSearchParams(window.location.search).get('stripe'), { hasSeller, ready })
        if (json.error) setError(visibleError(json.error, t.connectError))
        else if (notice === 'incomplete') { setShowConnect(true); setError(t.connectResume) }
        else if (notice === 'expired') { setShowConnect(true); setError(t.connectExpired) }
      })
      .catch(() => setConnect((current) => ({ ...current, loading: false })))
  }, [t.connectError, t.connectExpired, t.connectResume])

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
          priceSek: draft.priceSek,
          salesLimit: draft.salesLimit,
          downloadsPerFile: draft.downloadsPerFile,
          description: draft.description,
          imageUpload: draft.imageUpload || null,
          timeLimitMinutes: draft.timeLimitMinutes,
          source: storedSource(),
        }),
      })
      const json = await readJson(res)
      if (res.status === 402 && json.quotaExceeded) throw new Error(json.error || (sv ? 'Du har använt alla nya länkar för den här månaden.' : 'You have used all new links for this billing month.'))
      if (res.status === 402 && json.needsPlan) { window.location.assign('/plans'); return }
      if (!res.ok) throw new Error(json.error || 'Could not create the link.')
      clearDraft()
      setShowConnect(false)
      setListing(json)
      trackEvent('product_created', { item_type: 'digital', currency: json.priceUsd != null ? 'usd' : 'sek' })
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
    if (!connect.subscribed) return
    if (price === String(FREE_MIN_USD)) setPrice(String(SUB_MIN_USD))
    if (price === String(FREE_MIN_SEK)) setPrice(String(SUB_MIN_SEK))
  }, [connect.subscribed])

  // Swedish sellers price in kronor by default. The locale is only known after
  // hydration, so follow it until the seller picks a currency themselves.
  useEffect(() => {
    if (!currencyChosen.current) applyCurrency(locale === 'sv' ? 'sek' : 'usd')
  }, [locale])

  function chooseCurrency(next) {
    currencyChosen.current = true
    applyCurrency(next)
  }

  function applyCurrency(next) {
    setCurrency(next)
    setPrice(String(next === 'sek' ? (connect.subscribed ? SUB_MIN_SEK : FREE_MIN_SEK) : (connect.subscribed ? SUB_MIN_USD : FREE_MIN_USD)))
  }

  async function startConnect() {
    setError(null)
    setConnectError(null)
    setConnecting(true)
    try {
      const response = await fetch(connect.hasSeller ? '/api/billing/connect' : '/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnTo: 'sell' }),
      })
      const json = await readJson(response)
      if (!response.ok || !json.url || !/^https:\/\//.test(json.url)) throw new Error(visibleError(json.error, t.connectError))
      trackEvent('stripe_connect_started')
      window.location.href = json.url
    } catch (err) {
      const message = err.message || t.connectError
      setError(message)
      setConnectError(message)
      setConnecting(false)
    }
  }

  async function readJson(res) {
    const text = await res.text()
    if (!text) return {}
    try { return JSON.parse(text) } catch { return { error: visibleError(text, t.connectError) } }
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

  const minPrice = currency === 'sek'
    ? (connect.subscribed ? SUB_MIN_SEK : FREE_MIN_SEK)
    : (connect.subscribed ? SUB_MIN_USD : FREE_MIN_USD)
  const presets = currency === 'sek'
    ? (connect.subscribed ? SEK_PRESETS_SUB : SEK_PRESETS)
    : (connect.subscribed ? SUB_PRESETS : FREE_PRESETS)
  const amount = Number.parseFloat(price)
  const validPrice = Number.isFinite(amount) && amount >= minPrice
  const money = (value) => formatMoney(value, currency, locale)
  const split = saleSplit(validPrice ? amount : minPrice, connect.feeBps)
  const maxBytes = maxMB * 1024 * 1024
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover])
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview) }, [coverPreview])

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
    if (!validPrice) return setError(sv ? `Priset måste vara minst ${money(minPrice)}.` : `Price must be at least ${money(minPrice)}.`)
    if (!accepted) return setError(t.confirmErr)
    if (!stripeReady) return setError(t.stripeDown)
    if (files.length > 1 && !blobReady) return setError(t.packageUnavailable)

    if (!blobReady) return setError(t.packageUnavailable)
    // The raw cover may be larger; it is scaled down and re-encoded before upload.
    if (cover && (!IMAGE_TYPES[cover.type] || cover.size > 3 * MAX_IMAGE_BYTES)) return setError(sv ? 'Omslagsbilden ska vara JPG, PNG eller WebP (max 24 MB).' : 'Use a JPG, PNG or WebP cover (max 24 MB).')
    // The cover is public. Never let it be one of the paid files.
    if (cover && files.some((file) => file.size === cover.size && file.name === cover.name && file.lastModified === cover.lastModified)) {
      return setError(sv ? 'Omslagsbilden är en av filerna du säljer och skulle bli gratis för alla. Välj en förhandsbild i stället.' : 'The cover is one of the files you sell and would be free for everyone. Choose a preview image instead.')
    }
    setBusy(true)
    setProgress(2)
    try {
      const batch = crypto.randomUUID()
      // Shrink the cover first so a bad image fails before any file upload. The
      // server removes metadata again before the image is shown to anyone.
      const smallCover = cover ? await cleanImage(cover) : null
      const uploaded = []
      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        const blob = await upload(`uploads/${batch}/${file.name}`, file, {
          access: 'private', handleUploadUrl: '/api/upload-url',
          onUploadProgress: ({ percentage }) => setProgress(Math.round(((index + percentage / 100) / files.length) * 90)),
        })
        uploaded.push({ blobPathname: blob.pathname, name: file.name, size: file.size, type: file.type })
      }
      let imageUpload = null
      if (smallCover) {
        const blob = await upload(`uploads/image-staging/${batch}/cover.${IMAGE_TYPES[smallCover.type]}`, smallCover, {
          access: 'private', handleUploadUrl: '/api/upload-url', contentType: smallCover.type,
        })
        imageUpload = blob.pathname
      }
      const draft = {
        requestId: batch, accepted, uploaded, title,
        ...(currency === 'sek' ? { priceSek: String(amount) } : { priceUsd: String(amount) }),
        salesLimit, downloadsPerFile, description, timeLimitMinutes, imageUpload,
      }
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
    const label = listing.priceUsd != null ? formatMoney(listing.priceUsd, 'usd', locale) : formatMoney(listing.priceSek, 'sek', locale)
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.name, text: `Buy “${listing.name}” for ${label}`, url: shareUrl })
        return
      } catch {}
    }
    await copyLink()
  }

  if (listing) {
    const label = listing.priceUsd != null ? formatMoney(listing.priceUsd, 'usd', locale) : formatMoney(listing.priceSek, 'sek', locale)
    const pitch = sv ? `${listing.name}, ${label}. Betala med kort och ladda ner direkt:` : `${listing.name}, ${label}. Pay by card and download instantly:`
    const channels = [
      { label: 'X', href: `https://x.com/intent/post?text=${encodeURIComponent(pitch)}&url=${encodeURIComponent(shareUrl)}` },
      { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
      { label: sv ? 'E-post' : 'Email', href: `mailto:?subject=${encodeURIComponent(listing.name)}&body=${encodeURIComponent(`${pitch}\n${shareUrl}`)}` },
    ]
    return (
      <div className="space-y-5">
        <p className="ctb-kicker text-muted">{t.linkReady}</p>
        <div className="nl-card overflow-hidden rounded-md">
          {listing.imageUrl ? <img src={listing.imageUrl} alt="" className="max-h-48 w-full bg-paper-tint object-cover" /> : null}
          <div className="p-4">
            <h3 className="font-display text-2xl font-black">{listing.name}</h3>
            <p className="mt-1 text-sm text-ink-soft">{label} · {listing.fileCount} {listing.fileCount === 1 ? t.oneFile : t.manyFiles}</p>
            <p className="mt-3 break-all font-mono text-xs text-muted">{shareUrl}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg">{copied ? t.copied : t.copy}</button>
              <button type="button" onClick={shareLink} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-cyan/40 px-4 text-sm font-medium text-cyan">{t.share}</button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {channels.map((channel) => <a key={channel.label} href={channel.href} target="_blank" rel="noopener noreferrer" className="nl-chip inline-flex min-h-10 items-center justify-center rounded-sm px-3 text-xs font-medium text-ink no-underline">{channel.label}</a>)}
            </div>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-pine">{sv ? 'Öppna köpsidan' : 'Open your page'} →</a>
          </div>
        </div>
        <UseAnywhere id={listing.id} name={listing.name} priceLabel={label} />
        <div className="rounded-md border border-line p-4 text-sm text-ink-soft">
          <p className="font-medium text-ink">{sv ? 'Så får du din första försäljning' : 'How to get your first sale'}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
            <li>{sv ? 'Lägg länken i din bio på Instagram, TikTok eller X.' : 'Put the link in your Instagram, TikTok or X bio.'}</li>
            <li>{sv ? 'Posta en bild eller kort video av vad köparen får, med länken.' : 'Post a picture or short clip of what buyers get, with the link.'}</li>
            <li>{sv ? 'Skicka den direkt till personer som redan frågat efter filen.' : 'Send it directly to people who already asked for the file.'}</li>
          </ol>
        </div>
        <button
          type="button"
          className="text-sm text-muted underline underline-offset-4"
          onClick={() => {
            setListing(null)
            setFiles([])
            setTitle('')
            setCover(null)
            setProgress(0)
            if (inputRef.current) inputRef.current.value = ''
          }}
        >
          {t.another}
        </button>
      </div>
    )
  }

  const recovery = !connect.hasSeller && recover.mode !== 'idle' ? (
    <div className="space-y-2.5 rounded-sm border border-line bg-paper-tint p-3.5">
      <p className="text-xs font-medium text-ink">{t.recoverTitle}</p>
      {recover.mode === 'email' ? (
        <>
          <input
            type="email"
            value={recover.email}
            onChange={(event) => setRecover((current) => ({ ...current, email: event.target.value }))}
            placeholder={t.email}
            autoComplete="email"
            className="h-11 w-full rounded-sm border border-line bg-paper px-3 text-base text-ink outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={requestRecoveryCode}
            disabled={recover.busy || !recover.email}
            className="inline-flex h-11 w-full items-center justify-center rounded-sm border border-pine/50 text-sm font-medium text-pine disabled:opacity-50"
          >
            {recover.busy ? t.recoverSending : t.recoverSendCode}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted">{t.recoverSent}</p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
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
            className="inline-flex h-11 w-full items-center justify-center rounded-sm bg-pine text-sm font-medium text-pine-fg disabled:opacity-50"
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
  ) : null

  const recoverButton = !connect.hasSeller && recover.mode === 'idle' ? (
    <button
      type="button"
      onClick={() => setRecover({ mode: 'email', email: '', code: '', busy: false, error: null })}
      className="min-h-11 text-left text-xs text-muted underline underline-offset-4"
    >
      {sv ? 'Har du sålt här förut? Hämta ditt konto med e-post' : 'Sold here before? Get your account back by email'}
    </button>
  ) : null

  if (showConnect) {
    const draft = readDraft()
    const draftPrice = draft?.priceSek ? formatMoney(Number(draft.priceSek), 'sek', locale) : draft?.priceUsd ? formatMoney(Number(draft.priceUsd), 'usd', locale) : null
    return (
      <div className="space-y-5">
        <Steps current={3} sv={sv} />
        {draft ? (
          <div className="flex items-center gap-3 rounded-md border border-line bg-paper-tint p-3.5">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine text-sm text-pine-fg">✓</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{draft.title || (sv ? 'Din produkt' : 'Your product')}{draftPrice ? ` · ${draftPrice}` : ''}</p>
              <p className="text-xs text-muted">{sv ? 'Sparad. Länken blir aktiv när Stripe är anslutet.' : 'Saved. The link goes live once Stripe is connected.'}</p>
            </div>
          </div>
        ) : null}
        <div>
          <h3 className="font-display text-2xl font-black">{sv ? 'Sista steget: få betalt' : 'Last step: get paid'}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{sv
            ? 'Stripe tar emot kortbetalningarna och betalar ut till ditt bankkonto. Du anger e-post här och resten hos Stripe. Det görs en gång och tar några minuter.'
            : 'Stripe takes the card payments and pays out to your bank account. Enter your email here and the rest at Stripe. You do this once and it takes a few minutes.'}</p>
        </div>
        {!connect.hasSeller ? (
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.email}
            autoComplete="email"
            className="h-12 w-full rounded-sm border border-line bg-paper-tint px-3 text-base text-ink outline-none placeholder:text-muted"
          />
        ) : null}
        {error ? <p role="alert" className="text-sm text-warn">{error}</p> : null}
        <button
          type="button"
          onClick={startConnect}
          disabled={connecting || (!connect.hasSeller && !email)}
          className="inline-flex h-12 w-full items-center justify-center rounded-sm bg-pine px-5 text-base font-medium text-pine-fg disabled:opacity-50"
        >
          {connecting ? t.openingStripe : connect.hasSeller ? t.continueStripe : t.connectButton}
        </button>
        <p className="text-xs leading-relaxed text-muted">{sv
          ? 'Inget lösenord hos Nytto Checkout. Du kommer tillbaka hit automatiskt när du är klar hos Stripe.'
          : 'No Nytto Checkout password. You come back here automatically when you are done at Stripe.'}</p>
        {recoverButton}
        {recovery}
      </div>
    )
  }

  const field = 'h-12 w-full rounded-sm border border-line bg-paper-tint px-3 text-base text-ink outline-none placeholder:text-muted'
  const step = (n, label) => (
    <p className="flex items-center gap-2 text-sm font-semibold">
      <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-pine text-xs text-pine-fg">{n}</span>
      {label}
    </p>
  )

  return (
    <div className="space-y-7">
      {connect.loading ? null : connect.ready ? (
        <p className="flex items-center gap-2 rounded-sm bg-paper-tint px-3 py-2.5 text-xs text-ink-soft">
          <span aria-hidden="true" className="text-pine">●</span>
          {sv ? 'Stripe är anslutet. Pengarna går direkt till ditt konto.' : 'Stripe is connected. Money goes straight to your account.'}
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-xs leading-relaxed text-muted">{sv
            ? 'Fyll i produkten först. Stripe ansluter du i sista steget, en gång.'
            : 'Fill in your product first. You connect Stripe in the last step, once.'}</p>
          {recoverButton}
          {recovery}
        </div>
      )}

      <section className="space-y-3">
        {step(1, sv ? 'Välj filerna köparen får' : 'Choose the files buyers get')}
        <label
          htmlFor="file"
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files) }}
          className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center ${
            drag || files.length ? 'border-pine bg-sheet' : 'border-line bg-sheet hover:border-pine/50 hover:bg-paper-tint'
          }`}
        >
          <input ref={inputRef} id="file" type="file" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
          {files.length ? (
            <div>
              <p className="font-medium">{files.length} {files.length === 1 ? t.oneFile : t.manyFiles} · {(totalBytes / 1024 / 1024).toFixed(1)} MB</p>
              <p className="mt-1 text-sm text-pine">{sv ? 'Tryck för att byta' : 'Tap to change'}</p>
            </div>
          ) : (
            <>
              <p className="font-medium">{t.drop}</p>
              <p className="mt-1 text-sm text-muted">{sv ? `Upp till ${MAX_FILES} filer, totalt ${maxMB} MB.` : `Up to ${MAX_FILES} files, ${maxMB} MB total.`}</p>
            </>
          )}
        </label>
        {files.length ? <ul className="grid gap-1 text-sm text-ink-soft">{files.map((file) => <li key={`${file.name}-${file.size}`} className="truncate">✓ {file.name}</li>)}</ul> : null}
        <details className="text-sm [&_summary]:cursor-pointer">
          <summary className="min-h-11 py-2 text-xs text-muted underline underline-offset-4">{t.sellListTitle}</summary>
          <ul className="mt-1 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            {t.sellList.map((item) => <li key={item}>· {item}</li>)}
          </ul>
          <p className="mt-3 text-xs text-muted">{t.sellListFoot}</p>
          <p className="mt-2 text-xs text-warn">{t.sellListCodeNote}</p>
        </details>
      </section>

      <section className="space-y-3">
        {step(2, sv ? 'Namn och bild' : 'Name and picture')}
        <input id="title" aria-label={t.title} value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} className={field} placeholder={t.titleHint} />
        <label htmlFor="cover" className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line bg-sheet p-3 hover:border-pine/50">
          {coverPreview ? <img src={coverPreview} alt="" className="h-14 w-14 shrink-0 rounded-sm object-cover" /> : <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-paper-tint text-2xl text-muted">＋</span>}
          <span className="min-w-0 text-xs leading-relaxed text-muted">
            <span className="block text-sm font-medium text-ink">{cover ? cover.name : (sv ? 'Omslagsbild (valfri)' : 'Cover image (optional)')}</span>
            {sv ? 'Visas på köpsidan och när länken delas. Använd en förhandsbild, inte filen du säljer.' : 'Shown on your page and when the link is shared. Use a preview, not the file you sell.'}
          </span>
        </label>
        <input id="cover" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { setError(null); setCover(e.target.files?.[0] || null) }} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          {step(3, sv ? 'Pris' : 'Price')}
          <div className="flex rounded-sm border border-line p-0.5 text-xs font-semibold" role="group" aria-label={sv ? 'Valuta' : 'Currency'}>
            {[['sek', 'SEK'], ['usd', 'USD']].map(([code, name]) => (
              <button key={code} type="button" aria-pressed={currency === code} onClick={() => chooseCurrency(code)} className={`min-h-9 rounded-sm px-3 ${currency === code ? 'bg-pine text-pine-fg' : 'text-ink'}`}>{name}</button>
            ))}
          </div>
        </div>
        <div className="relative">
          <input
            id="price"
            aria-label={sv ? 'Pris' : 'Price'}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))}
            className={`${field} ${currency === 'usd' ? 'pl-7' : 'pr-10'}`}
            placeholder={String(minPrice)}
          />
          <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-muted ${currency === 'usd' ? 'left-3' : 'right-3'}`}>{currency === 'usd' ? '$' : 'kr'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPrice(String(n))}
              aria-pressed={amount === n}
              className={`min-h-11 rounded-sm px-3.5 text-sm font-medium ${amount === n ? 'bg-pine text-pine-fg' : 'nl-chip text-ink'}`}
            >
              {money(n)}
            </button>
          ))}
        </div>
        <p className={`text-sm ${validPrice || !price ? 'text-ink-soft' : 'text-warn'}`}>{validPrice
          ? (connect.feeBps
            ? (sv ? `Du får ${money(split.keep)} per köp. Nytto Checkout tar ${money(split.fee)} (${connect.feeBps / 100} %), Stripe drar sin kortavgift.` : `You get ${money(split.keep)} per sale. Nytto Checkout takes ${money(split.fee)} (${connect.feeBps / 100}%), Stripe deducts its card fee.`)
            : (sv ? `Du får ${money(split.keep)} per köp, minus Stripes kortavgift.` : `You get ${money(split.keep)} per sale, minus Stripe's card fee.`))
          : (sv ? `Lägsta pris är ${money(minPrice)}.` : `The minimum price is ${money(minPrice)}.`)}</p>
      </section>

      <details className="rounded-md border border-line px-3.5 py-2.5 text-sm">
        <summary className="min-h-8 cursor-pointer font-medium text-ink">{sv ? 'Fler inställningar (valfritt)' : 'More settings (optional)'}</summary>
        <div className="mt-4 space-y-5">
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
        </div>
      </details>

      <div className="space-y-4">
        <label className="flex items-start gap-3 text-xs leading-relaxed text-muted">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
          {t.ageConfirm}
        </label>

        {error ? <p role="alert" className="text-sm text-warn">{error}</p> : null}

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
          {!stripeReady ? t.stripeDown : busy ? `${t.creating} ${progress}%` : connect.ready ? t.create : (sv ? 'Fortsätt: anslut Stripe →' : 'Continue: connect Stripe →')}
        </button>
      </div>
    </div>
  )
}

function Steps({ current, sv }) {
  const labels = sv ? ['Produkt', 'Pris', 'Få betalt'] : ['Product', 'Price', 'Get paid']
  return (
    <ol className="flex items-center gap-2 text-xs text-muted" aria-label={sv ? 'Steg' : 'Steps'}>
      {labels.map((label, i) => (
        <li key={label} className={`flex items-center gap-2 ${i + 1 === current ? 'font-semibold text-ink' : ''}`} aria-current={i + 1 === current ? 'step' : undefined}>
          <span aria-hidden="true" className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] ${i + 1 < current ? 'bg-pine/20 text-pine' : i + 1 === current ? 'bg-pine text-pine-fg' : 'border border-line'}`}>{i + 1 < current ? '✓' : i + 1}</span>
          {label}
          {i < labels.length - 1 ? <span aria-hidden="true" className="text-line">—</span> : null}
        </li>
      ))}
    </ol>
  )
}
