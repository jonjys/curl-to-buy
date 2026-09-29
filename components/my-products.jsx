'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from './locale'
import AccountRecover from './account-recover'
import UseAnywhere from './use-anywhere'
import { PageIntro } from './site-chrome'

const COPY = {
  en: {
    kicker: 'Seller', title: 'My products', lead: 'Each product has its own checkout link.',
    create: 'Create product', search: 'Search products', type: 'Product type', all: 'All types', physical: 'Physical', digital: 'Digital',
    active: 'Active', paused: 'Paused', soldOut: 'Sold out', expired: 'Expired',
    stockLeft: (n, of) => `${n} of ${of} left`, unlimited: 'Unlimited stock', sold: (n) => `${n} sold`,
    created: 'Created', view: 'View checkout', copy: 'Copy link', copied: 'Copied', share: 'Share',
    anywhere: 'QR and website button', hide: 'Hide', pause: 'Pause', resume: 'Activate', orders: 'View orders',
    pauseNote: 'Pausing stops new checkouts. Checkouts already open and paid downloads keep working.',
    loading: 'Loading your products…', more: 'Load more products', noMatch: 'No match among the products loaded so far.',
    emptyTitle: 'No products yet', emptyLead: 'Create your first product and you get a checkout link you can put anywhere.',
    recoverTitle: 'Find your products', recoverLead: 'Nytto Checkout has no passwords. Your products belong to the seller identity on the device you used. On a new device, use the same email address you used when you connected Stripe and we send you a code.',
    failed: 'Could not update the product.', copyFailed: 'Could not copy the link.',
  },
  sv: {
    kicker: 'Säljare', title: 'Mina produkter', lead: 'Varje produkt har sin egen checkout-länk.',
    create: 'Skapa produkt', search: 'Sök produkter', type: 'Produkttyp', all: 'Alla typer', physical: 'Fysisk', digital: 'Digital',
    active: 'Aktiv', paused: 'Pausad', soldOut: 'Slutsåld', expired: 'Utgången',
    stockLeft: (n, of) => `${n} av ${of} kvar`, unlimited: 'Obegränsat lager', sold: (n) => `${n} sålda`,
    created: 'Skapad', view: 'Visa checkout', copy: 'Kopiera länk', copied: 'Kopierad', share: 'Dela',
    anywhere: 'QR och webbplatsknapp', hide: 'Dölj', pause: 'Pausa', resume: 'Aktivera', orders: 'Visa ordrar',
    pauseNote: 'Pausning stoppar nya köp. Redan öppnade kassor och betalda nedladdningar fungerar som vanligt.',
    loading: 'Hämtar dina produkter…', more: 'Visa fler produkter', noMatch: 'Ingen träff bland de produkter som hämtats hittills.',
    emptyTitle: 'Inga produkter ännu', emptyLead: 'Skapa din första produkt så får du en checkout-länk som du kan lägga var som helst.',
    recoverTitle: 'Hitta dina produkter', recoverLead: 'Nytto Checkout har inga lösenord. Dina produkter hör till säljaridentiteten på enheten du använde. På en ny enhet använder du samma e-postadress som när du anslöt Stripe, så skickar vi en kod.',
    failed: 'Kunde inte uppdatera produkten.', copyFailed: 'Kunde inte kopiera länken.',
  },
}

export function priceLabel(item, locale) {
  const currency = item.currency === 'sek' ? 'SEK' : item.currency === 'usd' ? 'USD' : null
  if (!currency) return null
  const amount = Number.isInteger(item.priceCents) ? item.priceCents / 100 : Number(item.priceSek ?? item.priceUsd)
  if (!Number.isFinite(amount)) return null
  return new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-US', { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount)
}

export function productStatus(item, now = Date.now()) {
  if (Number.isInteger(item.salesLimit) && (item.salesCount || 0) >= item.salesLimit) return 'soldOut'
  if (item.expiresAt && now >= item.expiresAt) return 'expired'
  if (item.paused) return 'paused'
  return 'active'
}

const STATUS_STYLE = {
  active: 'bg-[var(--ctb-mint)] text-ink',
  paused: 'bg-[var(--ctb-butter)] text-ink',
  soldOut: 'bg-ink text-pine-fg',
  expired: 'bg-line text-ink',
}

function ProductCard({ item, c, locale, onToggle, changing }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const status = productStatus(item)
  const price = priceLabel(item, locale)
  const sold = item.salesCount || 0
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/dl/${item.id}`
  const btn = 'inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink no-underline hover:border-ink disabled:opacity-50'

  async function copy() {
    setError('')
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { setError(c.copyFailed) }
  }
  async function share() {
    setError('')
    try { if (navigator.share) await navigator.share({ title: item.name, url }); else await copy() } catch (err) { if (err?.name !== 'AbortError') setError(c.copyFailed) }
  }

  return (
    <li className="ctb-card overflow-hidden">
      <div className="grid gap-0 sm:grid-cols-[11rem_1fr]">
        <div className={`relative bg-paper sm:aspect-auto sm:h-full sm:min-h-44 ${item.imageUrl ? 'aspect-[4/3]' : 'h-16'}`}>
          {item.imageUrl
            ? <img src={item.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            : <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-[0.16em] text-muted">{item.kind === 'physical' ? c.physical : c.digital}</div>}
        </div>
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">{item.kind === 'physical' ? c.physical : c.digital}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[status]}`}>{c[status]}</span>
          </div>
          <h2 className="mt-3 break-words text-2xl font-extrabold leading-tight tracking-tight">{item.name}</h2>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
            {price ? <div><dt className="sr-only">Price</dt><dd className="text-lg font-extrabold text-ink">{price}</dd></div> : null}
            <div className="self-end"><dt className="sr-only">Stock</dt><dd>{Number.isInteger(item.salesLimit) ? c.stockLeft(Math.max(0, item.salesLimit - sold), item.salesLimit) : c.unlimited}</dd></div>
            <div className="self-end"><dt className="sr-only">Sold</dt><dd>{c.sold(sold)}</dd></div>
            {item.createdAt ? <div className="self-end"><dt className="inline">{c.created} </dt><dd className="inline">{new Date(item.createdAt).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-GB')}</dd></div> : null}
          </dl>
          <p className="mt-2 truncate font-mono text-xs text-muted">{url.replace(/^https?:\/\//, '')}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`/dl/${encodeURIComponent(item.id)}`} className="ctb-btn ctb-btn-dark min-h-11 px-4 text-sm">{c.view}</a>
            <button type="button" onClick={copy} className={btn}>{copied ? c.copied : c.copy}</button>
            <button type="button" onClick={share} className={btn}>{c.share}</button>
            <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={btn}>{open ? c.hide : c.anywhere}</button>
            <button type="button" disabled={changing} onClick={() => onToggle(item)} className={btn}>{changing ? '…' : item.paused ? c.resume : c.pause}</button>
            {item.kind === 'physical' ? <a href={`/orders/${encodeURIComponent(item.id)}`} className={btn}>{c.orders}</a> : null}
          </div>
          {error ? <p role="alert" className="mt-2 text-sm text-warn">{error}</p> : null}
        </div>
      </div>
      {open ? <div className="border-t border-line bg-paper-tint p-5 sm:p-6"><UseAnywhere id={item.id} name={item.name} priceLabel={price} location="product_card" /></div> : null}
    </li>
  )
}

export default function MyProducts() {
  const { locale } = useLocale()
  const c = COPY[locale] || COPY.en
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unauthorized, setUnauthorized] = useState(false)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const [changing, setChanging] = useState('')
  const visible = items.filter((item) => (kind === 'all' || item.kind === kind)
    && String(item.name || '').toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()))

  const load = useCallback(async (nextCursor = null) => {
    setLoading(true); setError('')
    try {
      const response = await fetch(nextCursor ? `/api/my-links?cursor=${encodeURIComponent(nextCursor)}` : '/api/my-links', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (response.status === 401) { setUnauthorized(true); setItems([]); setCursor(null); return }
      if (!response.ok) throw new Error(body.error || 'Could not load products.')
      setUnauthorized(false)
      setItems((current) => {
        const seen = new Map((nextCursor ? current : []).map((item) => [item.id, item]))
        for (const item of body.links || []) seen.set(item.id, item)
        return [...seen.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      })
      setCursor(body.nextCursor || null)
    } catch (err) { setError(err.message || 'Could not load products.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function toggle(item) {
    setChanging(item.id); setError('')
    try {
      const response = await fetch(`/api/my-links/${encodeURIComponent(item.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paused: !item.paused }) })
      const result = await response.json()
      if (!response.ok) throw Error(result.error)
      setItems((current) => current.map((link) => (link.id === item.id ? { ...link, paused: result.paused } : link)))
    } catch (err) { setError(err.message || c.failed) }
    finally { setChanging('') }
  }

  const field = 'min-h-12 rounded-full border border-line bg-white px-4 text-sm text-ink'
  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <PageIntro kicker={c.kicker} title={c.title} lead={c.lead} />
        <Link href="/upload" className="ctb-btn ctb-btn-dark">{c.create} <span aria-hidden="true" className="ctb-arrow">→</span></Link>
      </div>

      {unauthorized ? (
        <div className="ctb-card grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_1fr] md:items-start">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">{c.recoverTitle}</h2>
            <p className="mt-2 leading-relaxed text-ink-soft">{c.recoverLead}</p>
          </div>
          <AccountRecover />
        </div>
      ) : null}

      {error ? <p role="alert" className="text-sm text-warn">{error}</p> : null}

      {!unauthorized && (items.length > 0 || cursor) ? (
        <div className="flex flex-wrap gap-3">
          <input type="search" aria-label={c.search} placeholder={c.search} value={query} onChange={(e) => setQuery(e.target.value)} className={`${field} min-w-0 flex-1`} />
          <select aria-label={c.type} value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
            <option value="all">{c.all}</option>
            <option value="physical">{c.physical}</option>
            <option value="digital">{c.digital}</option>
          </select>
        </div>
      ) : null}

      {!unauthorized && !loading && !error && items.length === 0 && !cursor ? (
        <div className="ctb-card p-6 text-center sm:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight">{c.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-soft">{c.emptyLead}</p>
          <Link href="/upload" className="ctb-btn ctb-btn-dark mt-6">{c.create}</Link>
        </div>
      ) : null}
      {!unauthorized && items.length > 0 && !visible.length ? <p className="text-sm text-muted">{c.noMatch}</p> : null}

      {visible.length ? <ul className="grid gap-5">{visible.map((item) => <ProductCard key={item.id} item={item} c={c} locale={locale} onToggle={toggle} changing={changing === item.id} />)}</ul> : null}
      {!unauthorized && items.length > 0 ? <p className="text-sm text-muted">{c.pauseNote}</p> : null}
      {!unauthorized && cursor ? <button type="button" disabled={loading} onClick={() => load(cursor)} className="min-h-12 w-full rounded-full border border-line bg-white px-4 text-sm font-semibold disabled:opacity-50">{loading ? '…' : c.more}</button> : null}
      {!unauthorized && loading && !items.length ? <p role="status" className="text-sm text-muted">{c.loading}</p> : null}
    </section>
  )
}
