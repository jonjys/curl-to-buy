import Stripe from 'stripe'

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2026-07-29.dahlia' })
}

export function stripeReady() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
