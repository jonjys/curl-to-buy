'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from './locale'

function priceLabel(item, locale) {
  const currency = item.currency === 'sek' ? 'SEK' : item.currency === 'usd' ? 'USD' : null
  if (!currency) return '—'
  const amount = Number.isInteger(item.priceCents)
    ? item.priceCents / 100
    : Number(item.priceSek ?? item.priceUsd)
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-US', { style: 'currency', currency }).format(amount)
}

export default function SavedLinks() {
  const { locale } = useLocale()
  const sv = locale === 'sv'
  const [links, setLinks] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unauthorized, setUnauthorized] = useState(false)
  const [copied, setCopied] = useState('')

  const load = useCallback(async (nextCursor = null) => {
    setLoading(true)
    setError('')
    try {
      const url = nextCursor ? `/api/my-links?cursor=${encodeURIComponent(nextCursor)}` : '/api/my-links'
      const response = await fetch(url, { cache: 'no-store' })
      const body = await response.json()
      if (response.status === 401) { setUnauthorized(true); setCursor(null); return }
      if (!response.ok) throw new Error(body.error || 'Could not load links.')
      setUnauthorized(false)
      setLinks((current) => {
        const seen = new Map((nextCursor ? current : []).map((item) => [item.id, item]))
        for (const item of body.links || []) seen.set(item.id, item)
        return [...seen.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      })
      setCursor(body.nextCursor || null)
    } catch (err) { setError(err.message || 'Could not load links.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function copy(id) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/dl/${id}`)
      setCopied(id)
    } catch { setError(sv ? 'Kunde inte kopiera länken.' : 'Could not copy link.') }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-kicker text-pine">{sv ? 'Säljaröversikt' : 'Seller dashboard'}</p>
          <h1 className="mt-2 font-display text-3xl font-black">{sv ? 'Dina sparade länkar' : 'Your saved links'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{sv ? 'Länkarna sparas i Curl-to-Buy, inte bara i din mobil. Logga in med samma säljarkonto för att se dem igen.' : 'Your links are saved in Curl-to-Buy, not just on this device. Use the same seller account to see them again.'}</p>
        </div>
        <a href="/upload" className="inline-flex min-h-11 items-center rounded-lg bg-pine px-4 text-sm font-semibold text-pine-fg no-underline">{sv ? 'Skapa ny länk' : 'Create new link'}</a>
      </div>

      {unauthorized ? (
        <div className="nl-card rounded-xl p-5 text-sm leading-relaxed">
          <p>{sv ? 'Vi hittar inget säljarkonto på den här enheten. Återställ kontot med din e-postadress under Digital fil → Återställ säljarkonto.' : 'No seller account found on this device. Recover it by email from Create link → Digital file → Recover seller account.'}</p>
          <a href="/upload" className="mt-3 inline-flex min-h-11 items-center text-pine underline">{sv ? 'Gå till återställning' : 'Go to account recovery'}</a>
        </div>
      ) : null}

      {error ? <p role="alert" className="text-sm text-warn">{error}</p> : null}
      {!unauthorized && !loading && links.length === 0 && !cursor ? <p className="rounded-xl border border-line p-5 text-sm text-ink-soft">{sv ? 'Inga sparade länkar ännu. Skapa din första köplänk.' : 'No saved links yet. Create your first payment link.'}</p> : null}

      {links.length ? <ul className="space-y-3">{links.map((item) => (
        <li key={item.id} className="nl-card rounded-xl p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-kicker text-pine">{item.kind === 'physical' ? (sv ? 'Fysisk vara' : 'Physical item') : (sv ? 'Digital fil' : 'Digital file')}</p>
              <h2 className="mt-1 break-words text-lg font-bold">{item.name}</h2>
              <p className="mt-1 text-sm text-ink-soft">{priceLabel(item, locale)}{item.expiresAt && Date.now() >= item.expiresAt ? ` · ${sv ? 'Utgången' : 'Expired'}` : ''}</p>
            </div>
            <a href={`/dl/${encodeURIComponent(item.id)}`} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-pine no-underline">{sv ? 'Visa länk' : 'View link'}</a>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(item.id)} className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold">{copied === item.id ? (sv ? 'Kopierad!' : 'Copied!') : (sv ? 'Kopiera länk' : 'Copy link')}</button>
            {item.kind === 'physical' ? <a href={`/orders/${encodeURIComponent(item.id)}`} className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-pine no-underline">{sv ? 'Betalda ordrar' : 'Paid orders'}</a> : null}
          </div>
        </li>
      ))}</ul> : null}
      {!unauthorized && cursor ? <button type="button" disabled={loading} onClick={() => load(cursor)} className="min-h-12 w-full rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-50">{loading ? '…' : (sv ? 'Visa fler sparade länkar' : 'Load more saved links')}</button> : null}
      {!unauthorized && loading && !links.length ? <p role="status" className="text-sm text-muted">{sv ? 'Hämtar dina länkar…' : 'Loading your links…'}</p> : null}
    </section>
  )
}
