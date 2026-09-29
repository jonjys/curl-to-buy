'use client'

import { Analytics } from '@vercel/analytics/next'
import { track } from '@vercel/analytics'
import { EVENTS, campaignSource, safeProps, scrubUrl } from '../lib/analytics'

const SOURCE_KEY = 'nytto-checkout:source'

export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })} />
}

// The campaign source for this browser tab: the campaign path the visitor
// arrived on, or an allowlisted utm_source. Anything else is ignored.
export function rememberSource(value) {
  const source = campaignSource(value)
  try { if (source) sessionStorage.setItem(SOURCE_KEY, source) } catch {}
  return source
}

function storedSource() {
  try {
    return campaignSource(sessionStorage.getItem(SOURCE_KEY))
      || rememberSource(new URLSearchParams(window.location.search).get('utm_source'))
  } catch { return null }
}

// Fire and forget. Analytics must never block or break a user action.
export function trackEvent(name, props = {}) {
  try {
    if (!EVENTS.includes(name)) return
    const source = storedSource()
    track(name, safeProps({ ...(source ? { source } : {}), ...props }))
  } catch {}
}
