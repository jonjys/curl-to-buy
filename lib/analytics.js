// Privacy rules for Vercel Web Analytics. Only these event names and these
// property values are ever sent. Never names, emails, product or file names,
// IDs, storage paths or full checkout URLs.

export const EVENTS = [
  'campaign_landing',
  'create_link_clicked',
  'stripe_connect_started',
  'product_created',
  'checkout_viewed',
  'checkout_started',
  'qr_downloaded',
  'embed_copied',
]

// Campaign paths and the only accepted values for `source`.
export const CAMPAIGN_SOURCES = ['threads', 'instagram', 'x', 'tiktok']

const ALLOWED = {
  source: CAMPAIGN_SOURCES,
  location: ['hero', 'header', 'examples', 'final_cta', 'success', 'product_card', 'buy_page', 'plans'],
  item_type: ['digital', 'physical'],
  currency: ['usd', 'sek', 'eur'],
  plan: ['start', 'grow', 'scale'],
  format: ['png', 'svg'],
}

export function campaignSource(value) {
  const source = String(value || '').toLowerCase()
  return CAMPAIGN_SOURCES.includes(source) ? source : null
}

export function safeProps(props = {}) {
  const out = {}
  for (const [key, allowed] of Object.entries(ALLOWED)) {
    const value = typeof props[key] === 'string' ? props[key].toLowerCase() : null
    if (value && allowed.includes(value)) out[key] = value
  }
  return out
}

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
const UTM_VALUE = /^[\w.-]{1,100}$/

// Page views and events carry the page URL. Product and order IDs become a
// route pattern, and every query parameter except UTM tags is dropped, so
// Checkout session IDs, seller links and cursors never leave the browser.
export function scrubUrl(value) {
  let url
  try { url = new URL(value) } catch { return value }
  const path = url.pathname
    .replace(/^\/dl\/[^/]+/, '/dl/[id]')
    .replace(/^\/orders\/[^/]+/, '/orders/[id]')
  const query = new URLSearchParams()
  for (const key of UTM) {
    const tag = url.searchParams.get(key)
    if (tag && UTM_VALUE.test(tag)) query.set(key, tag)
  }
  const search = query.toString()
  return `${url.origin}${path}${search ? `?${search}` : ''}`
}
