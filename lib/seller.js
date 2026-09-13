import { randomBytes, createHash, timingSafeEqual } from 'crypto'

// Sellers have no login. Instead, a seller is identified by possession of a
// long random secret, delivered as an HttpOnly cookie the browser sends back
// automatically. This is what actually authorizes starting/resuming Stripe
// onboarding and viewing payout status — never a listing id, which is public
// (it's in the buy link the seller shares with anyone).
export const SELLER_COOKIE_NAME = 'nl_seller'
const SELLER_ID_RE = /^[a-f0-9]{18}$/
const SECRET_RE = /^[a-f0-9]{64}$/

export function newSellerId() {
  return randomBytes(9).toString('hex')
}

export function newSellerSecret() {
  return randomBytes(32).toString('hex')
}

export function hashSecret(secret) {
  return createHash('sha256').update(secret).digest('hex')
}

export function secretMatches(secret, hash) {
  if (typeof secret !== 'string' || typeof hash !== 'string') return false
  const actual = Buffer.from(hashSecret(secret))
  const expected = Buffer.from(hash)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function cookieValue(sellerId, secret) {
  return `${sellerId}.${secret}`
}

export function parseCookieValue(raw) {
  if (!raw || typeof raw !== 'string') return null
  const i = raw.indexOf('.')
  if (i < 0) return null
  const sellerId = raw.slice(0, i)
  const secret = raw.slice(i + 1)
  if (!SELLER_ID_RE.test(sellerId) || !SECRET_RE.test(secret)) return null
  return { sellerId, secret }
}

// One year: this is a durable "who is this seller" credential, not a session.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export function sellerCookieHeader(value) {
  return [
    `${SELLER_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SECONDS}`,
  ].join('; ')
}

function readCookie(req, name) {
  const header = req.headers.get('cookie') || ''
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const key = part.slice(0, eq).trim()
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim())
      } catch {
        return part.slice(eq + 1).trim()
      }
    }
  }
  return null
}

// Resolves the caller's seller record from the request's cookie, verifying
// the secret against the stored hash. Returns null if there is no cookie, it
// is malformed, the seller no longer exists, or the secret does not match.
export async function currentSellerFromRequest(req, { getSeller }) {
  const raw = readCookie(req, SELLER_COOKIE_NAME)
  const parsed = parseCookieValue(raw)
  if (!parsed) return null
  const seller = await getSeller(parsed.sellerId)
  if (!seller || !secretMatches(parsed.secret, seller.secretHash)) return null
  return seller
}
