export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://pay.nyttolabs.com'
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
      const proto = req.headers.get('x-forwarded-proto') || 'https'
      return `${proto}://${host}`
    }
  } catch {}
  return SITE
}
