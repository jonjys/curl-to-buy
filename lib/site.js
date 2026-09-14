export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://pay.nyttolabs.com'
export const FEE = 0.05
export const MIN_USD = 5
export const DEFAULT_USD = 5
export const MAX_MB = 100
export const MAX_FILES = 20
export const PRESETS = [5, 9, 29]
export const SUPPORT = 'support@nyttolabs.com'

export function originFrom(req) {
  try {
    const host = String(req?.headers?.get('x-forwarded-host') || req?.headers?.get('host') || '')
      .split(',')[0]
      .trim()
    if (host && !/^localhost(:\d+)?$/i.test(host) && !host.startsWith('127.')) {
      const proto = req.headers.get('x-forwarded-proto') || 'https'
      return `${proto}://${host}`
    }
  } catch {}
  return SITE
}
