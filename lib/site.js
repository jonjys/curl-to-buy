const RESTORED_SITE = 'https://pay.nyttolabs.com'
const RETIRED_HOST = 'getpaidlink.nyttolabs.com'

function restoredSite(value) {
  const url = new URL(value || RESTORED_SITE)
  // A previous deployment setting must not reintroduce the withdrawn name.
  return url.hostname.toLowerCase() === RETIRED_HOST ? RESTORED_SITE : url.origin
}

export const SITE = restoredSite(process.env.NEXT_PUBLIC_SITE_URL)
export const MIN_USD = 10
export const DEFAULT_USD = 10
export const MAX_MB = 100
export const MAX_FILES = 20
export const PRESETS = [10, 15, 29]
export const SUPPORT = 'support@nyttolabs.com'
export const MAX_SALES_LIMIT = 100000
export const MAX_DESCRIPTION_LENGTH = 300
export const TIME_LIMIT_MINUTES = [15, 60, 360, 1440, 4320]

export function originFrom(req) {
  try {
    const host = String(req?.headers?.get('x-forwarded-host') || req?.headers?.get('host') || '')
      .split(',')[0]
      .trim()
    if (host && !/^localhost(:\d+)?$/i.test(host) && !host.startsWith('127.')) {
      // Existing links on the withdrawn host still work while it remains attached.
      // New Checkout/Connect return URLs use the restored public address.
      if (host.split(':')[0].toLowerCase() === RETIRED_HOST) return RESTORED_SITE
      const proto = req.headers.get('x-forwarded-proto') || 'https'
      return `${proto}://${host}`
    }
  } catch {}
  return SITE
}

// Live Stripe rejects http return URLs. Preview hosts stay on their own origin.
export function httpsOrigin(req) {
  try {
    const url = new URL(originFrom(req))
    if (url.protocol !== 'https:') url.protocol = 'https:'
    return url.origin
  } catch {
    return SITE
  }
}

export function onboardingNotice(flag, status) {
  if (flag === 'refresh') return 'expired'
  if (flag === 'return' && status?.hasSeller && !status?.ready) return 'incomplete'
  if (flag === 'return' && status?.ready) return 'ready'
  return null
}
