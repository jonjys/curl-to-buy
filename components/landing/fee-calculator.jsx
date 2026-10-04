'use client'

import { useId, useState } from 'react'
import { FREE_FEE_BPS, FREE_MIN_SEK, FREE_MIN_USD, SUB_FEE_BPS, SUB_MIN_SEK, SUB_MIN_USD } from '../../lib/entitlement'
import { PLAN_EUR, breakEven, formatMoney, saleSplit } from '../../lib/fee-math'

const START = { usd: 19, sek: 300 }
const MIN = { free: { usd: FREE_MIN_USD, sek: FREE_MIN_SEK }, sub: { usd: SUB_MIN_USD, sek: SUB_MIN_SEK } }

// Interactive "what do I keep" calculator. Shows only exact numbers: Nytto
// Checkout's cut and what reaches the seller before Stripe's own card fee.
export default function FeeCalculator({ copy, locale }) {
  const k = copy
  const id = useId()
  const [currency, setCurrency] = useState('usd')
  const [price, setPrice] = useState(String(START.usd))
  const [sales, setSales] = useState('10')
  const money = (value, cur = currency) => formatMoney(value, cur, locale)
  const free = saleSplit(price, FREE_FEE_BPS)
  const sub = saleSplit(price, SUB_FEE_BPS)
  const count = Math.max(0, Math.min(100000, Math.floor(Number(sales) || 0)))
  const monthlyFee = Math.round(free.fee * count * 100) / 100
  const startBreakEven = breakEven(PLAN_EUR.start, FREE_FEE_BPS)

  function pick(next) {
    setCurrency(next)
    setPrice(String(START[next]))
  }

  const below = (tier) => free.price > 0 && free.price < MIN[tier][currency]
  const row = (label, value, strong = false) => (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${strong ? 'mt-1 border-t pt-3' : ''}`} style={strong ? { borderTopColor: 'color-mix(in srgb, currentColor 20%, transparent)' } : undefined}>
      <dt className={strong ? 'font-bold' : 'opacity-80'}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-2xl font-extrabold tracking-tight' : 'font-semibold'}`}>{value}</dd>
    </div>
  )

  return (
    <div className="ctb-card mt-5 p-6 sm:p-9">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{k.title}</h3>
          <p className="mt-2 leading-relaxed text-[var(--color-ink-soft)]">{k.lead}</p>
          <div role="group" aria-label={k.kind} className="mt-6 grid w-full grid-cols-2 rounded-full border sm:inline-grid sm:w-auto border-[var(--color-line)] bg-[var(--color-paper)] p-1">
            {[['usd', k.digital], ['sek', k.physical]].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={currency === value} onClick={() => pick(value)}
                className={`min-h-11 whitespace-nowrap rounded-full px-3 text-sm font-bold sm:px-5 ${currency === value ? 'bg-[#16130f] text-[#fffaf2]' : 'text-[var(--color-ink)]'}`}>{label}</button>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
            <label htmlFor={`${id}-price`} className="grid gap-1.5 text-sm font-bold">
              {k.price}
              <span className="flex min-h-12 items-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-tint)] px-4 focus-within:ring-2 focus-within:ring-[var(--ctb-accent)]">
                {currency === 'usd' ? <span aria-hidden="true" className="mr-1 text-[var(--color-muted)]">$</span> : null}
                <input id={`${id}-price`} inputMode="decimal" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-transparent text-lg font-semibold tabular-nums outline-none" />
                {currency === 'sek' ? <span aria-hidden="true" className="ml-1 text-[var(--color-muted)]">kr</span> : null}
              </span>
            </label>
            <label htmlFor={`${id}-sales`} className="grid gap-1.5 text-sm font-bold">
              {k.sales}
              <span className="flex min-h-12 items-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-tint)] px-4 focus-within:ring-2 focus-within:ring-[var(--ctb-accent)]">
                <input id={`${id}-sales`} inputMode="numeric" type="number" min="0" step="1" value={sales} onChange={(e) => setSales(e.target.value)}
                  className="w-full bg-transparent text-lg font-semibold tabular-nums outline-none" />
              </span>
            </label>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">{k.stripe}</p>
        </div>

        <div aria-live="polite" className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
            <p className="font-extrabold">{k.freeName}</p>
            <dl className="mt-3 text-sm">
              {row(k.rowPrice, money(free.price))}
              {row(k.rowFee, `− ${money(free.fee)}`)}
              {row(k.rowKeep, money(free.keep), true)}
            </dl>
            <p className="mt-3 text-sm text-[var(--color-ink-soft)]">{k.monthly(money(monthlyFee), count)}</p>
            {below('free') ? <p className="mt-2 text-sm font-semibold text-[#b3261e]">{k.minimum(money(MIN.free[currency]))}</p> : null}
          </div>
          <div className="rounded-[1.5rem] bg-[#16130f] p-5 text-[#fffaf2]">
            <p className="font-extrabold">{k.subName}</p>
            <dl className="mt-3 text-sm">
              {row(k.rowPrice, money(sub.price))}
              {row(k.rowFee, `− ${money(sub.fee)}`)}
              {row(k.rowKeep, money(sub.keep), true)}
            </dl>
            <p className="mt-3 text-sm text-[#e9e1d4]">{k.plans(money(PLAN_EUR.start, 'eur'), money(PLAN_EUR.grow, 'eur'), money(PLAN_EUR.scale, 'eur'))}</p>
            {below('sub') ? <p className="mt-2 text-sm font-semibold text-[#ffb4a8]">{k.minimum(money(MIN.sub[currency]))}</p> : null}
          </div>
          <p className="text-sm font-medium leading-relaxed sm:col-span-2">{k.breakEven(money(PLAN_EUR.start, 'eur'), money(startBreakEven, 'eur'))}</p>
        </div>
      </div>
    </div>
  )
}
