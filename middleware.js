import { NextResponse } from 'next/server'
import { previewIsolated } from './lib/preview-isolation'

const OLD_HOST = 'pay.nyttolabs.com'
const NEW_HOST = 'getpaidlink.nyttolabs.com'

export function middleware(request) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const path = request.nextUrl.pathname

  // Keep old browser links working, but never redirect API calls or Stripe webhooks.
  if (host === OLD_HOST && path !== '/api' && !path.startsWith('/api/')
    && (request.method === 'GET' || request.method === 'HEAD')) {
    const url = request.nextUrl.clone()
    url.protocol = 'https:'
    url.hostname = NEW_HOST
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  // Catalog is a read-only display; it cannot grant entitlements or take payment.
  if (path === '/api/billing/plans') return NextResponse.next()
  if (path.startsWith('/api/') && !previewIsolated(process.env)) {
    return NextResponse.json({
      error: 'This preview needs an isolated Stripe sandbox and Blob store before account or payment flows can be tested.',
      code: 'preview_not_isolated',
    }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
