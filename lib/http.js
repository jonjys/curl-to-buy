import { blobAccessError } from './blob-error'

export function sameOrigin(req) {
  const origin = req.headers.get('origin')
  return !origin || origin === new URL(req.url).origin
}

export function visibleError(value, fallback) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text || text.length > 200) return fallback
  if (/vercel blob:|node:internal|\bat\s+\S+:\d+|unexpected token|<!doctype|<html/i.test(text)) return fallback
  return text
}

export function clientError(error, fallback, status = 503) {
  const mapped = blobAccessError(error)
  if (mapped) return { error: mapped.message, status: mapped.status }
  const message = visibleError(error?.message, '')
  if (error?.status && message) return { error: message, status: error.status }
  return { error: fallback, status }
}

export function privateJson(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}
