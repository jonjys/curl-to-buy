export const SUB_MIN_USD = 5
export const FREE_MIN_USD = 10
export const SUB_MIN_SEK = 50
export const FREE_MIN_SEK = 100
export const SUB_FEE_BPS = 0
export const FREE_FEE_BPS = 500
export const SUB_PRESETS = Object.freeze([5, 9, 29])
export const FREE_PRESETS = Object.freeze([10, 15, 29])

export function saleTerms(subscribed) {
  return subscribed
    ? { subscribed: true, minUsd: SUB_MIN_USD, minSek: SUB_MIN_SEK, feeBps: SUB_FEE_BPS, billingMode: 'subscription', presets: SUB_PRESETS }
    : { subscribed: false, minUsd: FREE_MIN_USD, minSek: FREE_MIN_SEK, feeBps: FREE_FEE_BPS, billingMode: 'freemium', presets: FREE_PRESETS }
}

export function isSubscribed(billing) {
  return Boolean(billing?.active)
}

export function checkoutFeeBps(subscribed, seller) {
  if (subscribed) return SUB_FEE_BPS
  const custom = Number(seller?.feeBps)
  return Number.isFinite(custom) && custom >= 0 ? custom : FREE_FEE_BPS
}

/** New listings always charge on the seller account. Only pre-freemium links stay destination. */
export function usesDirectCharge(listing) {
  return listing?.billingMode === 'freemium'
    || listing?.billingMode === 'subscription'
    || Boolean(listing?.paymentAccountId)
}

export function priceError(terms, locale, currency) {
  const sv = locale === 'sv'
  if (currency === 'sek') {
    return sv ? `Priset måste vara minst ${terms.minSek} kr.` : `Price must be at least ${terms.minSek} SEK.`
  }
  return sv ? `Priset måste vara minst $${terms.minUsd}.` : `Price must be at least $${terms.minUsd}.`
}
