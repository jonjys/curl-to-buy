import { FEE } from './site'

// Empirically calibrated from a real $1.00 USD charge on the Nytto Labs
// Stripe account (2026-09-13): total Stripe fee was 214 öre SEK (195
// processing + 19 currency-conversion, since Curl-to-Buy charges in USD but
// this account settles in SEK), converting to ≈ $0.2206 at that charge's
// exchange rate. This is an ESTIMATE for planning/copy purposes only —
// Stripe's real per-charge fee varies with card brand, card country, and
// the FX rate at settlement time. It is never applied as a formula against
// a real charge; the only true fee is the one Stripe reports after the
// charge happens.
const ESTIMATED_FEE_PERCENT = 0.035
const ESTIMATED_FEE_FIXED_CENTS = 18.56

export function estimatedStripeFeeCents(priceCents) {
  return Math.round(ESTIMATED_FEE_PERCENT * priceCents + ESTIMATED_FEE_FIXED_CENTS)
}

// LIVE behavior (what /api/checkout/[id] actually uses today): the
// platform's cut is exactly 5% of the price. Under Stripe's destination
// charges (what this app uses), Stripe's real processing fee is then
// debited from the PLATFORM's balance, not the seller's — the seller's
// transfer (price - applicationFee) is unaffected by it either way.
export function platformAbsorbsCostFee(priceCents) {
  return Math.round(priceCents * FEE)
}

// NOT wired into checkout. Computed here only for review: the application
// fee is enlarged by the estimated Stripe cost, so the seller's payout
// shrinks by roughly that amount instead — the seller effectively bears
// the processing cost. The platform only nets close to a clean 5% to the
// extent the estimate matches that charge's real fee; it will not be exact
// charge-by-charge, since Stripe's actual fee isn't known until after the
// charge settles.
export function sellerAbsorbsCostFee(priceCents) {
  return platformAbsorbsCostFee(priceCents) + estimatedStripeFeeCents(priceCents)
}
