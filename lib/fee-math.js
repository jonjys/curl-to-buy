// Fee arithmetic for the landing page calculator. No imports, so the browser
// bundle and the tests can both load it directly.

// Monthly plan prices in EUR. Must match VERIFIED_PLANS in lib/billing.js;
// tests/fee-math.test.mjs fails if they drift.
export const PLAN_EUR = Object.freeze({ start: 5, grow: 19, scale: 49 })

const round2 = (value) => Math.round(value * 100) / 100

// What Nytto Checkout takes from one sale and what reaches the seller before
// Stripe's own card fee. `feeBps` is basis points (500 = 5%).
export function saleSplit(price, feeBps) {
  const amount = Number(price)
  if (!Number.isFinite(amount) || amount <= 0) return { price: 0, fee: 0, keep: 0 }
  const fee = round2(amount * feeBps / 10000)
  return { price: round2(amount), fee, keep: round2(amount - fee) }
}

// Monthly sales above which a flat plan costs less than the percentage fee.
export function breakEven(planPrice, feeBps) {
  return feeBps > 0 ? round2(planPrice * 10000 / feeBps) : null
}

export function formatMoney(value, currency, locale = 'en') {
  const sv = locale === 'sv'
  const digits = Number.isInteger(value) ? 0 : 2
  const number = value.toLocaleString(sv ? 'sv-SE' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: 2 })
  if (currency === 'sek') return `${number} kr`
  if (currency === 'eur') return sv ? `${number} €` : `€${number}`
  return `$${number}`
}
