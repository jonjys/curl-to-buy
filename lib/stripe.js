import Stripe from 'stripe'

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

export function stripeReady() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
