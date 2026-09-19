'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '../../../components/locale'

export default function OrdersBox({ id }) {
  const { locale } = useLocale()
  const sv = locale === 'sv'
  const [state, setState] = useState({ loading: true, error: null, result: null })
  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const res = await fetch(`/api/item-orders/${encodeURIComponent(id)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load orders.')
      setState({ loading: false, error: null, result: json })
    } catch (error) { setState({ loading: false, error: error.message || 'Could not load orders.', result: null }) }
  }, [id])
  useEffect(() => { refresh() }, [refresh])
  return (
    <div className="space-y-5">
      <p className="font-mono text-xs font-semibold uppercase tracking-kicker text-pine">{sv ? 'Säljarkonto · beställningar' : 'Seller account · orders'}</p>
      <h1 className="font-display text-3xl font-black">{state.result?.name || (sv ? 'Dina beställningar' : 'Your orders')}</h1>
      <p className="text-sm leading-relaxed text-ink-soft">{sv ? 'Endast du som skapade länken kan se köparens kontakt- och leveransuppgifter. Du ansvarar för att skicka varan.' : 'Only the seller who created the link can view buyer contact and delivery details. You are responsible for shipping the item.'}</p>
      <button type="button" onClick={refresh} disabled={state.loading} className="min-h-11 rounded-lg border border-pine/50 px-4 text-sm font-semibold text-pine disabled:opacity-50">{state.loading ? (sv ? 'Uppdaterar…' : 'Refreshing…') : (sv ? 'Uppdatera beställningar' : 'Refresh orders')}</button>
      {state.error ? <div role="alert" className="nl-card rounded-xl p-4 text-sm text-warn"><p>{state.error}</p><p className="mt-2 text-xs text-ink-soft">{sv ? 'Om du har bytt enhet kan du återställa ditt säljarkonto med e-post under Digital fil-fliken.' : 'If you changed devices, recover your seller account by email from the Digital file tab.'}</p><Link href="/upload" className="mt-2 inline-block text-pine underline">{sv ? 'Tillbaka till säljaren' : 'Back to selling'}</Link></div> : null}
      {!state.loading && !state.error && !state.result?.orders?.length ? <div className="nl-card rounded-xl p-5 text-sm text-ink-soft">{sv ? 'Ingen betald beställning ännu. Dela köplänken och kom tillbaka hit när någon har betalat.' : 'No paid orders yet. Share your payment link and return here when someone has paid.'}</div> : null}
      {(state.result?.orders || []).map((order) => {
        const address = order.shippingAddress || {}
        return <article key={order.reference} className="nl-card space-y-2 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-kicker text-pine">{sv ? 'Betald beställning' : 'Paid order'}</p>
          <p className="text-sm text-muted">{new Date(order.created * 1000).toLocaleString(sv ? 'sv-SE' : 'en-GB')}</p>
          <p className="font-display text-xl font-bold">{order.amount != null ? `${(order.amount / 100).toFixed(2)} ${String(order.currency || 'sek').toUpperCase()}` : ''}</p>
          <p className="text-sm font-semibold">{sv ? 'Köpare' : 'Buyer'}</p>
          <p className="break-words text-sm text-ink-soft">{order.buyerName || '—'}</p>
          <p className="break-all text-sm text-ink-soft">{order.buyerEmail || '—'}</p>
          {order.buyerPhone ? <p className="text-sm text-ink-soft">{order.buyerPhone}</p> : null}
          <p className="pt-2 text-sm font-semibold">{sv ? 'Leveransadress' : 'Shipping address'}</p>
          <address className="whitespace-pre-line break-words text-sm not-italic text-ink-soft">{[address.line1, address.line2, [address.postal_code, address.city].filter(Boolean).join(' '), address.state, address.country].filter(Boolean).join('\n') || '—'}</address>
          <p className="break-all pt-2 font-mono text-[10px] text-muted">{order.reference}</p>
        </article>
      })}
      {state.result?.hasMore ? <p className="text-xs text-warn">{sv ? 'Fler än 100 beställningar – kontakta support för resterande.' : 'More than 100 orders — contact support for the remainder.'}</p> : null}
    </div>
  )
}
