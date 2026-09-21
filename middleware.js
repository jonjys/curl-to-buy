import { NextResponse } from 'next/server'
import { previewIsolated } from './lib/preview-isolation'

export function middleware(request) {
  // Catalog is a read-only display; it cannot grant entitlements or take payment.
  if (request.nextUrl.pathname === '/api/billing/plans') return NextResponse.next()
  if (!previewIsolated(process.env)) {
    return NextResponse.json({
      error: 'This preview needs an isolated Stripe sandbox and Blob store before account or payment flows can be tested.',
      code: 'preview_not_isolated',
    }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
  }
  return NextResponse.next()
}

export const config = { matcher: ['/api/:path*'] }
