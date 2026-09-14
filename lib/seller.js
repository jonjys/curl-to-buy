import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const COOKIE = 'ctb_seller'

export function newSellerId() {
  return randomBytes(18).toString('base64url')
}

function signature(id) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return ''
  return createHmac('sha256', key).update(id).digest('base64url')
}

export function sellerCookie(id) {
  return `${COOKIE}=${id}.${signature(id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
}

export function sellerIdFromRequest(req) {
  const match = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))
  if (!match) return null
  const [id, supplied] = decodeURIComponent(match[1]).split('.')
  if (!id || !supplied || /[^a-zA-Z0-9_-]/.test(id)) return null
  const expected = signature(id)
  const left = Buffer.from(supplied)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right) ? id : null
}

export function validSellerEmail(value) {
  const email = String(value || '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null
}

export function feeBpsForEmail(email) {
  return email === 'annakubel.photo@gmail.com' ? 100 : 500
}
