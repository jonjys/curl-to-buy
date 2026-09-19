'use client'

import { useEffect, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { useLocale } from './locale'

const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export default function ItemForm({ stripeReady, blobReady }) {
  const { locale } = useLocale()
  const sv = locale === 'sv'
  const [connect, setConnect] = useState({ loading: true, ready: false, hasSeller: false, feeBps: 500 })
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [condition, setCondition] = useState('used_good')
  const [price, setPrice] = useState('300')
  const [photo, setPhoto] = useState(null)
  const [shippingIncluded, setShippingIncluded] = useState(false)
  const [adult, setAdult] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [listing, setListing] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/connect/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => setConnect({ loading: false, ready: Boolean(json.ready), hasSeller: Boolean(json.hasSeller), feeBps: json.feeBps || 500 }))
      .catch(() => setConnect((current) => ({ ...current, loading: false })))
  }, [])

  async function readJson(response) {
    const body = await response.text()
    try { return JSON.parse(body) } catch { return { error: body.slice(0, 160) } }
  }

  async function startConnect() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const json = await readJson(response)
      if (!response.ok || !json.url) throw new Error(json.error || 'Stripe setup failed.')
      window.location.assign(json.url)
    } catch (err) { setError(err.message || 'Stripe setup failed.'); setBusy(false) }
  }

  async function publish() {
    setError('')
    if (!stripeReady) return setError(sv ? 'Stripe är inte tillgängligt.' : 'Stripe is unavailable.')
    if (!connect.ready) return setError(sv ? 'Anslut Stripe först.' : 'Connect Stripe first.')
    if (title.trim().length < 3) return setError(sv ? 'Ange varans namn.' : 'Enter an item title.')
    const amount = Number(price.replace(',', '.'))
    if (!Number.isFinite(amount) || amount < 50) return setError(sv ? 'Minst 50 kr.' : 'Minimum 50 SEK.')
    if (!shippingIncluded || !adult) return setError(sv ? 'Bekräfta frakt och ålder.' : 'Confirm shipping and age.')
    if (photo && (!PHOTO_TYPES[photo.type] || photo.size > 8 * 1024 * 1024)) return setError(sv ? 'Välj JPG, PNG eller WebP (max 8 MB).' : 'Use JPG, PNG or WebP (max 8 MB).')
    if (photo && !blobReady) return setError(sv ? 'Bilduppladdning är inte tillgänglig.' : 'Photo upload is unavailable.')
    setBusy(true)
    try {
      let photoUrl = null
      if (photo) {
        const batch = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        const blob = await upload(`uploads/items/${batch}/item.${PHOTO_TYPES[photo.type]}`, photo, {
          access: 'public', handleUploadUrl: '/api/upload-url', contentType: photo.type,
        })
        photoUrl = blob.url
      }
      const response = await fetch('/api/register-item', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), condition, priceSek: amount, photoUrl, shippingIncluded }),
      })
      const json = await readJson(response)
      if (!response.ok || !json.id) throw new Error(json.error || 'Could not publish item.')
      setListing(json)
    } catch (err) { setError(err.message || 'Could not publish item.') }
    finally { setBusy(false) }
  }

  const shareUrl = listing && typeof window !== 'undefined' ? `${window.location.origin}/dl/${listing.id}` : ''
  const ordersUrl = listing && typeof window !== 'undefined' ? `${window.location.origin}/orders/${listing.id}` : ''
  const amount = Number(price.replace(',', '.'))
  const share = Number.isFinite(amount) ? (amount * (1 - (connect.feeBps || 500) / 10000)).toFixed(2) : '0.00'
  const field = 'h-12 w-full rounded-sm border border-line bg-paper-tint px-3 text-base text-ink outline-none placeholder:text-muted'

  if (listing) return (
    <div className="space-y-4">
      <p className="font-mono text-xs font-bold uppercase tracking-kicker text-pine">{sv ? 'Din köplänk är klar' : 'Your payment link is ready'}</p>
      <h3 className="font-display text-2xl font-black">{listing.name}</h3>
      <p className="text-sm text-ink-soft">{listing.priceSek} kr · {sv ? '1 vara · frakt ingår' : '1 item · shipping included'}</p>
      <div className="nl-card rounded-xl p-4"><p className="break-all text-sm text-ink-soft">{shareUrl}</p></div>
      <button type="button" className="min-h-12 w-full rounded-lg bg-pine px-4 font-semibold text-pine-fg" onClick={async () => {
        try { await navigator.clipboard.writeText(shareUrl); setCopied(true) } catch { setError('Could not copy the link.') }
      }}>{copied ? (sv ? 'Kopierad!' : 'Copied!') : (sv ? 'Kopiera köplänken' : 'Copy payment link')}</button>
      <a className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-pine/60 px-4 text-sm font-semibold text-pine no-underline" href={ordersUrl}>{sv ? 'Se köpare och leveransuppgifter' : 'View buyer and shipping details'}</a>
      <p className="text-xs leading-relaxed text-muted">{sv ? 'Spara orderlänken. Du måste använda samma säljarkonto eller återställa det via e-post på denna tjänst.' : 'Keep the order link. You must use the same seller account or recover it through email on this service.'}</p>
      <button type="button" className="text-sm text-muted underline" onClick={() => { setListing(null); setTitle(''); setDescription(''); setPhoto(null); setShippingIncluded(false) }}>{sv ? 'Sälj en till vara' : 'Sell another item'}</button>
    </div>
  )

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">{sv ? 'Sälj en tröja, barnvagn eller annan fysisk sak. Skapa länken här och dela den i en chatt eller på sociala medier.' : 'Sell a hoodie, stroller or other physical item. Make a link here and share it in a chat or on social media.'}</p>
      {!connect.loading && !connect.ready ? (
        <div className="space-y-3 rounded-xl border border-pine/40 bg-paper-tint p-4">
          <h3 className="text-base font-semibold">{sv ? 'Anslut Stripe för att få betalt' : 'Connect Stripe to receive payments'}</h3>
          <p className="text-xs text-ink-soft">{sv ? 'Detta behövs bara en gång. Har du redan sålt på en annan enhet kan du återställa ditt säljarkonto via Digital fil-fliken.' : 'This is a one-time step. If you sold on another device, recover your seller account from the Digital file tab.'}</p>
          {!connect.hasSeller ? <input className={field} type="email" autoComplete="email" placeholder={sv ? 'Din e-postadress' : 'Your email'} value={email} onChange={(e) => setEmail(e.target.value)} /> : null}
          <button type="button" onClick={startConnect} disabled={busy || (!connect.hasSeller && !email)} className="min-h-12 w-full rounded-lg bg-pine text-sm font-semibold text-pine-fg disabled:opacity-50">{busy ? '…' : (sv ? 'Fortsätt till Stripe' : 'Continue to Stripe')}</button>
        </div>
      ) : null}
      <label className="block space-y-2 text-sm font-semibold">{sv ? 'Vad säljer du?' : 'What are you selling?'}<input className={field} maxLength={100} placeholder={sv ? 'T.ex. Hoodie, storlek M' : 'e.g. Hoodie, size M'} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block space-y-2 text-sm font-semibold">{sv ? 'Bild (valfri)' : 'Photo (optional)'}<input className="block w-full text-sm font-normal" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />{photo ? <span className="block text-xs font-normal text-muted">{photo.name}</span> : null}</label>
      <label className="block space-y-2 text-sm font-semibold">{sv ? 'Skick' : 'Condition'}<select className={field} value={condition} onChange={(e) => setCondition(e.target.value)}><option value="new">{sv ? 'Ny' : 'New'}</option><option value="used_good">{sv ? 'Begagnad – bra skick' : 'Used – good condition'}</option><option value="used_fair">{sv ? 'Begagnad – bruksskick' : 'Used – fair condition'}</option></select></label>
      <label className="block space-y-2 text-sm font-semibold">{sv ? 'Beskrivning (valfri)' : 'Description (optional)'}<textarea className={`${field} min-h-24 py-3`} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={sv ? 'Storlek, mått, eventuella skador…' : 'Size, dimensions, any flaws…'} /></label>
      <label className="block space-y-2 text-sm font-semibold">{sv ? 'Pris inklusive frakt, kr' : 'Price including shipping, SEK'}<input className={field} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ''))} /></label>
      <p className="text-xs leading-relaxed text-muted">{sv ? `Säljaren får ${share} kr före eventuella Stripe- och andra avgifter. Plattformens avgift är ${(connect.feeBps || 500) / 100} %.` : `Seller share: ${share} SEK before Stripe and other fees. Platform fee: ${(connect.feeBps || 500) / 100}%.`}</p>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-ink-soft"><input type="checkbox" checked={shippingIncluded} onChange={(e) => setShippingIncluded(e.target.checked)} className="mt-1" />{sv ? 'Jag ansvarar för att skicka varan inom Sverige. Frakten ingår i priset och köparens adress hämtas säkert i Stripe Checkout.' : 'I am responsible for shipping within Sweden. Shipping is included and the buyer enters their address in Stripe Checkout.'}</label>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-ink-soft"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1" />{sv ? 'Jag är minst 18 år och har rätt att sälja och skicka varan.' : 'I am at least 18 and have the right to sell and ship this item.'}</label>
      {error ? <p role="alert" className="text-sm text-warn">{error}</p> : null}
      <button type="button" disabled={busy || connect.loading || !connect.ready || !stripeReady} onClick={publish} className="min-h-12 w-full rounded-lg bg-pine px-4 font-semibold text-pine-fg disabled:opacity-50">{busy ? (sv ? 'Skapar länk…' : 'Creating link…') : (sv ? 'Skapa köplänk för varan' : 'Create item payment link')}</button>
      <p className="text-xs text-muted">{sv ? 'Köparen behöver inget konto. Köp och frakt hanteras mellan köpare och säljare; detta är ingen köparskydds- eller frakttjänst.' : 'The buyer needs no account. Buyer and seller arrange fulfillment; this is not an escrow, buyer-protection or shipping service.'}</p>
    </div>
  )
}
