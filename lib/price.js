import { MIN_USD } from './site'

export function parsePrice(input = {}) {
  const usd = Number.parseFloat(String(input.priceUsd ?? input.price ?? ''))
  if (Number.isFinite(usd) && usd >= MIN_USD) {
    return {
      currency: 'usd',
      priceUsd: Math.round(usd * 100) / 100,
      priceSek: null,
      priceCents: Math.round(usd * 100),
    }
  }
  const sek = Number.parseFloat(String(input.priceSek ?? ''))
  if (Number.isFinite(sek) && sek >= 3) {
    return {
      currency: 'sek',
      priceUsd: null,
      priceSek: Math.round(sek * 100) / 100,
      priceCents: Math.round(sek * 100),
    }
  }
  return null
}

export function displayPrice(listing) {
  const currency = listing.currency || (listing.priceUsd != null ? 'usd' : 'sek')
  if (currency === 'sek') {
    const sek = listing.priceSek ?? (listing.priceCents ? listing.priceCents / 100 : 0)
    return {
      currency: 'sek',
      amount: listing.priceCents || Math.round(sek * 100),
      label: `${sek} SEK`,
      number: sek,
    }
  }
  const usd = listing.priceUsd ?? (listing.priceCents ? listing.priceCents / 100 : 0)
  return {
    currency: 'usd',
    amount: listing.priceCents || Math.round(usd * 100),
    label: usd % 1 === 0 ? `$${usd.toFixed(0)}` : `$${usd.toFixed(2)}`,
    number: usd,
  }
}

export function keepOf(amount) {
  return Math.round(amount * 0.95 * 100) / 100
}
