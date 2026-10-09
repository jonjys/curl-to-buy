'use client'

import { useEffect, useState, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import { useLocale } from './locale'
import { storedSource, trackEvent } from './analytics'
import UseAnywhere from './use-anywhere'
import { FREE_MIN_SEK, SUB_MIN_SEK } from '../lib/entitlement'
import { onboardingNotice } from '../lib/site'
import { visibleError } from '../lib/http'
import { cleanImage } from '../lib/clean-image'
import { formatMoney, saleSplit } from '../lib/fee-math'

const ITEM_DRAFT = 'curl-to-buy:pending-item'
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const COUNTRIES = [['SE', 'Sverige'], ['DK', 'Danmark'], ['FI', 'Finland'], ['NO', 'Norge'], ['DE', 'Deutschland'], ['FR', 'France'], ['NL', 'Nederland'], ['BE', 'België'], ['AT', 'Österreich'], ['IE', 'Ireland'], ['IT', 'Italia'], ['ES', 'España'], ['PT', 'Portugal'], ['PL', 'Polska']]

export default function ItemForm({ stripeReady, blobReady }) {
  const { locale } = useLocale()
  const sv = locale === 'sv'
  const [connect, setConnect] = useState({ loading: true, ready: false, hasSeller: false, subscribed: false, minSek: FREE_MIN_SEK, feeBps: 500 })
  const [email, setEmail] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [variant, setVariant] = useState('')
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
  const [stock, setStock] = useState('1')
  const [brand, setBrand] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [deliveryEstimate, setDeliveryEstimate] = useState('')
  const [returnPolicy, setReturnPolicy] = useState('')
  const [shippingCountries, setShippingCountries] = useState(['SE'])
  const finalizing = useRef(false)

  useEffect(() => {
    fetch('/api/connect/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => {
        const hasSeller = Boolean(json.hasSeller)
        const ready = Boolean(json.ready)
        setConnect({
          loading: false, ready, hasSeller,
          subscribed: Boolean(json.subscribed), minSek: json.subscribed ? SUB_MIN_SEK : FREE_MIN_SEK,
          feeBps: json.subscribed ? 0 : (json.feeBps || 500),
        })
        const notice = onboardingNotice(new URLSearchParams(window.location.search).get('stripe'), { hasSeller, ready })
        if (json.error) setError(visibleError(json.error, sv ? 'Kunde inte öppna Stripe-inställningen.' : 'Could not open Stripe setup.'))
        else if (notice === 'incomplete') setError(sv ? 'Stripe-inställningen är inte klar. Fortsätt för att återuppta den.' : 'Stripe setup is not finished. Continue to pick up where you left off.')
        else if (notice === 'expired') setError(sv ? 'Stripe-länken har gått ut. Fortsätt för att öppna en ny.' : 'That Stripe link expired. Continue to open a new one.')
      })
      .catch(() => setConnect((current) => ({ ...current, loading: false })))
  }, [sv])

  async function readJson(response) {
    const body = await response.text()
    try { return JSON.parse(body) } catch { return { error: visibleError(body, 'Stripe setup failed.') } }
  }

  async function startConnect() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(connect.hasSeller ? '/api/billing/connect' : '/api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, returnTo: 'sell' }) })
      const json = await readJson(response)
      if (!response.ok || !json.url || !/^https:\/\//.test(json.url)) throw new Error(visibleError(json.error, 'Stripe setup failed.'))
      trackEvent('stripe_connect_started')
      window.location.assign(json.url)
    } catch (err) { setError(err.message || 'Stripe setup failed.'); setBusy(false) }
  }

  async function finish(draft) {
    if (finalizing.current) return
    finalizing.current = true
    setBusy(true)
    try {
      const response = await fetch('/api/register-item', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, source: storedSource() }),
      })
      const json = await readJson(response)
      if (response.status === 402 && json.quotaExceeded) throw Error(json.error || (sv ? 'Du har använt alla nya länkar för den här månaden.' : 'You have used all new links for this billing month.'))
      if (response.status === 402 && json.needsPlan) { window.location.assign('/plans'); return }
      if (!response.ok || !json.id) throw Error(json.error || 'Could not publish item.')
      window.localStorage.removeItem(ITEM_DRAFT)
      setListing(json)
      trackEvent('product_created', { item_type: 'physical', currency: 'sek' })
    } catch (err) { setError(err.message) }
    finally { finalizing.current = false; setBusy(false) }
  }

  useEffect(() => {
    if (connect.loading || !connect.ready) return
    try {
      const raw = window.localStorage.getItem(ITEM_DRAFT)
      if (raw) finish(JSON.parse(raw))
    } catch { setError(sv ? 'Öppna varuformuläret igen.' : 'Please reopen the item form.') }
  }, [connect.loading, connect.ready])

  async function publish() {
    setError('')
    if (!stripeReady) return setError(sv ? 'Stripe är inte tillgängligt.' : 'Stripe is unavailable.')
    if (title.trim().length < 3) return setError(sv ? 'Ange varans namn.' : 'Enter an item title.')
    const amount = Number(price.replace(',', '.'))
    const minSek = connect.subscribed ? SUB_MIN_SEK : FREE_MIN_SEK
    if (!Number.isFinite(amount) || amount < minSek) return setError(sv ? `Minst ${minSek} kr.` : `Minimum ${minSek} SEK.`)
    if (!shippingIncluded || !adult) return setError(sv ? 'Bekräfta frakt och ålder.' : 'Confirm shipping and age.')
    if (!shippingCountries.length) return setError(sv ? 'Välj leveransländer.' : 'Choose delivery countries.')
    if (photo && (!PHOTO_TYPES[photo.type] || photo.size > 8 * 1024 * 1024)) return setError(sv ? 'Välj JPG, PNG eller WebP (max 8 MB).' : 'Use JPG, PNG or WebP (max 8 MB).')
    setBusy(true)
    try {
      const requestId = crypto.randomUUID()
      let photoUpload = null
      if (photo) {
        // Private staged upload; the server removes metadata before publishing it.
        const clean = await cleanImage(photo)
        const blob = await upload(`uploads/image-staging/${requestId}/item.${PHOTO_TYPES[clean.type]}`, clean, {
          access: 'private', handleUploadUrl: '/api/upload-url', contentType: clean.type,
        })
        photoUpload = blob.pathname
      }
      const draft = { requestId, accepted: adult, locale, title: title.trim(), description: description.trim(), condition,
        priceSek: amount, photoUpload, shippingIncluded, shippingCountries, brand, contactEmail, deliveryEstimate, returnPolicy, sourceUrl, variant,
        salesLimit: stock === 'unlimited' ? null : Number(stock) }
      window.localStorage.setItem(ITEM_DRAFT, JSON.stringify(draft))
      if (connect.ready) await finish(draft)
      else if (connect.hasSeller || email) await startConnect()
      else setError(sv ? 'Anslut Stripe först. Ange din e-postadress ovan.' : 'Connect Stripe first. Enter your email above.')
    } catch (err) { setError(err.message || 'Could not publish item.') }
    finally { setBusy(false) }
  }

  const shareUrl = listing && typeof window !== 'undefined' ? `${window.location.origin}/dl/${listing.id}` : ''
  const ordersUrl = listing && typeof window !== 'undefined' ? `${window.location.origin}/orders/${listing.id}` : ''
  const priceNumber = Number(String(price).replace(',', '.'))
  const priceOk = Number.isFinite(priceNumber) && priceNumber >= connect.minSek
  const itemSplit = saleSplit(priceOk ? priceNumber : connect.minSek, connect.feeBps)
  const kr = (value) => formatMoney(value, 'sek', locale)
  const field = 'h-12 w-full rounded-sm border border-line bg-paper-tint px-3 text-base text-ink outline-none placeholder:text-muted'

  if (listing) return (
    <div className="space-y-4">
      <p className="font-mono ctb-kicker text-muted">{sv ? 'Din köplänk är klar' : 'Your payment link is ready'}</p>
      <h3 className="font-display text-2xl font-black">{listing.name}</h3>
      <p className="text-sm text-ink-soft">{listing.priceSek} kr · {sv ? 'Frakt ingår' : 'Shipping included'}</p>
      <div className="nl-card rounded-xl p-4"><p className="break-all text-sm text-ink-soft">{shareUrl}</p></div>
      <button type="button" className="min-h-12 w-full rounded-lg bg-pine px-4 font-semibold text-pine-fg" onClick={async () => {
        try { await navigator.clipboard.writeText(shareUrl); setCopied(true) } catch { setError('Could not copy the link.') }
      }}>{copied ? (sv ? 'Kopierad!' : 'Copied!') : (sv ? 'Kopiera köplänken' : 'Copy payment link')}</button>
      <a className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-pine/60 px-4 text-sm font-semibold text-pine no-underline" href={ordersUrl}>{sv ? 'Se köpare och leveransuppgifter' : 'View buyer and shipping details'}</a>
      <UseAnywhere id={listing.id} name={listing.name} priceLabel={`${listing.priceSek} kr`} className="border-t border-line pt-5" />
      <p className="text-xs leading-relaxed text-muted">{sv ? 'Spara orderlänken. Du måste använda samma säljarkonto eller återställa det via e-post på denna tjänst.' : 'Keep the order link. You must use the same seller account or recover it through email on this service.'}</p>
      <button type="button" className="text-sm text-muted underline" onClick={() => { setListing(null); setTitle(''); setDescription(''); setPhoto(null); setShippingIncluded(false) }}>{sv ? 'Sälj en till vara' : 'Sell another item'}</button>
    </div>
  )

  return (
    <div className="space-y-5">
      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-semibold">{sv ? 'Har du redan en produkt i en webbutik?' : 'Already have a product in a web store?'}</summary>
        <label className="mt-3 block space-y-2 text-sm">{sv ? 'Produktens URL (valfri)' : 'Product URL (optional)'}<input type="url" className={field} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" /></label>
        <label className="mt-3 block space-y-2 text-sm">{sv ? 'Variant, storlek eller färg' : 'Variant, size or colour'}<input className={field} maxLength={120} value={variant} onChange={(e) => setVariant(e.target.value)} /></label>
        <p className="mt-3 text-xs text-muted">{sv ? 'Kopiera titel, bild och pris till formuläret och kontrollera leveransvillkoren. Länken sparas som referens; inga produkter hämtas och inga lager eller ordrar synkas.' : 'Copy the title, photo and price into the form and confirm delivery terms. The URL is saved as a reference; products are not fetched and inventory or orders are not synced.'}</p>
      </details>
      <label className="block space-y-2 text-sm font-semibold">{sv ? 'Namn på varan' : 'Item name'}<input className={field} maxLength={100} placeholder={sv ? 'T.ex. Hoodie, storlek M' : 'e.g. Hoodie, size M'} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line bg-sheet p-3 hover:border-pine/50">
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-paper-tint text-2xl text-muted">{photo ? '✓' : '＋'}</span>
        <span className="min-w-0 text-xs text-muted"><span className="block truncate text-sm font-medium text-ink">{photo ? photo.name : (sv ? 'Bild på varan (valfri)' : 'Photo of the item (optional)')}</span>{sv ? 'Visas på köpsidan och när länken delas.' : 'Shown on your page and when the link is shared.'}</span>
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
      </label>
      <label className="block space-y-2 text-sm font-semibold">{sv ? 'Skick' : 'Condition'}<select className={field} value={condition} onChange={(e) => setCondition(e.target.value)}><option value="new">{sv ? 'Ny' : 'New'}</option><option value="used_good">{sv ? 'Begagnad – bra skick' : 'Used – good condition'}</option><option value="used_fair">{sv ? 'Begagnad – bruksskick' : 'Used – fair condition'}</option></select></label>
      <label className="block space-y-2 text-sm font-semibold">{sv ? 'Beskrivning (valfri)' : 'Description (optional)'}<textarea className={`${field} min-h-24 py-3`} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={sv ? 'Storlek, mått, eventuella skador…' : 'Size, dimensions, any flaws…'} /></label>
      <label className="block space-y-2 text-sm font-semibold">{sv ? 'Pris inklusive frakt, kr' : 'Price including shipping, SEK'}<input className={field} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ''))} /></label>
      <div className="flex gap-2">{[connect.minSek, 300, 1000].map((amount) => <button key={amount} type="button" aria-pressed={priceNumber === amount} onClick={() => setPrice(String(amount))} className={`min-h-11 rounded-lg px-4 text-sm ${priceNumber === amount ? 'bg-pine text-pine-fg' : 'border border-line'}`}>{formatMoney(amount, 'sek', locale)}</button>)}</div>
      <p className={`text-sm ${priceOk ? 'text-ink-soft' : 'text-warn'}`}>{priceOk
        ? (connect.feeBps
          ? (sv ? `Du får ${kr(itemSplit.keep)} per köp. Nytto Checkout tar ${kr(itemSplit.fee)} (${connect.feeBps / 100} %), Stripe drar sin kortavgift.` : `You get ${kr(itemSplit.keep)} per sale. Nytto Checkout takes ${kr(itemSplit.fee)} (${connect.feeBps / 100}%), Stripe deducts its card fee.`)
          : (sv ? `Du får ${kr(itemSplit.keep)} per köp, minus Stripes kortavgift.` : `You get ${kr(itemSplit.keep)} per sale, minus Stripe's card fee.`))
        : (sv ? `Lägsta pris är ${kr(connect.minSek)}.` : `The minimum price is ${kr(connect.minSek)}.`)}</p>
      <label className="block space-y-2 text-sm font-semibold">{sv ? 'Antal att sälja' : 'Quantity available'}<select className={field} value={stock === 'unlimited' ? 'unlimited' : 'limited'} onChange={(e) => setStock(e.target.value === 'unlimited' ? 'unlimited' : '1')}><option value="limited">{sv ? 'Begränsat lager' : 'Limited stock'}</option><option value="unlimited">{sv ? 'Ingen köpgräns' : 'No purchase limit'}</option></select>{stock !== 'unlimited' ? <input className={field} type="number" min={1} max={100000} value={stock} onChange={(e) => setStock(e.target.value)} /> : null}</label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{sv ? 'Du skickar till' : 'You ship to'}</legend>
        <div className="flex flex-wrap gap-2 pt-2">{COUNTRIES.map(([code, name]) => {
          const on = shippingCountries.includes(code)
          return <button key={code} type="button" aria-pressed={on} onClick={() => setShippingCountries((list) => on ? list.filter((c) => c !== code) : [...list, code])} className={`min-h-10 rounded-full px-3.5 text-sm ${on ? 'bg-pine text-pine-fg' : 'border border-line text-ink'}`}>{name}</button>
        })}</div>
      </fieldset>
      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-semibold">{sv ? 'Valfria uppgifter' : 'Optional details'}</summary>
        <div className="mt-4 space-y-4">
          <p className="text-xs leading-relaxed text-muted">{sv ? 'Behövs inte för att skapa säljaren eller öppna Stripe. Stripe samlar in de juridiska uppgifterna.' : 'Not needed to create the seller or open Stripe. Stripe collects the legal details.'}</p>
          <label className="block space-y-2 text-sm font-semibold">{sv ? 'Varumärke (valfritt)' : 'Brand (optional)'}<input className={field} maxLength={80} value={brand} onChange={(e) => setBrand(e.target.value)} /></label>
          <label className="block space-y-2 text-sm font-semibold">{sv ? 'Kontaktadress som visas för köparen (valfritt)' : 'Contact email shown to buyers (optional)'}<input className={field} type="email" maxLength={254} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></label>
          <label className="block space-y-2 text-sm font-semibold">{sv ? 'Leveranstid (valfritt)' : 'Delivery time (optional)'}<input className={field} maxLength={160} value={deliveryEstimate} onChange={(e) => setDeliveryEstimate(e.target.value)} placeholder={sv ? 'Exempel: 3–5 arbetsdagar' : 'Example: 3–5 working days'} /></label>
          <label className="block space-y-2 text-sm font-semibold">{sv ? 'Returinformation (valfritt)' : 'Return information (optional)'}<textarea className={`${field} min-h-24 py-3`} maxLength={500} value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} /></label>
        </div>
      </details>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-ink-soft"><input type="checkbox" checked={shippingIncluded} onChange={(e) => setShippingIncluded(e.target.checked)} className="mt-1" />{sv ? 'Jag ansvarar för att skicka varan till valda länder. Frakten ingår i priset och köparens adress hämtas säkert i Stripe Checkout.' : 'I am responsible for shipping to the selected countries. Shipping is included and the buyer enters their address in Stripe Checkout.'}</label>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-ink-soft"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1" />{sv ? 'Jag är minst 18 år och har rätt att sälja och skicka varan.' : 'I am at least 18 and have the right to sell and ship this item.'}</label>
      {!connect.loading && !connect.ready ? (
        <div className="space-y-3 rounded-xl border border-pine/40 bg-paper-tint p-4">
          <h3 className="text-base font-semibold">{sv ? 'Sista steget: få betalt' : 'Last step: get paid'}</h3>
          <p className="text-xs leading-relaxed text-ink-soft">{sv ? 'Stripe tar emot betalningen och betalar ut till ditt bankkonto. Ange din e-post så fortsätter du hos Stripe. Det görs en gång.' : 'Stripe takes the payment and pays out to your bank account. Enter your email and continue at Stripe. You do this once.'}</p>
          {!connect.hasSeller ? <input className={field} type="email" autoComplete="email" placeholder={sv ? 'Din e-postadress' : 'Your email'} value={email} onChange={(e) => setEmail(e.target.value)} /> : null}
        </div>
      ) : null}
      {error ? <p role="alert" className="text-sm text-warn">{error}</p> : null}
      <button type="button" disabled={busy || connect.loading || !stripeReady} onClick={publish} className="min-h-12 w-full rounded-lg bg-pine px-4 font-semibold text-pine-fg disabled:opacity-50">{busy ? (sv ? 'Skapar länk…' : 'Creating link…') : connect.loading || connect.ready ? (sv ? 'Skapa köplänk för varan' : 'Create item payment link') : (sv ? 'Fortsätt till Stripe →' : 'Continue to Stripe →')}</button>
      <p className="text-xs text-muted">{sv ? 'Köparen behöver inget konto. Lager och beställningar synkas inte automatiskt med Shopify eller din leverantör.' : 'The buyer needs no account. Stock and orders do not automatically sync with Shopify or your supplier.'}</p>
    </div>
  )
}

