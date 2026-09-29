// Helpers for placing a product's public checkout anywhere: a link, a QR code
// or a plain HTML button. Everything here is derived from the public
// /dl/[id] URL only; no prices, payment data or storage paths are embedded.

const ID = /^[A-Za-z0-9_-]{1,80}$/

export function checkoutUrl(origin, id) {
  if (!ID.test(String(id))) throw new Error('Invalid product id.')
  const base = new URL(String(origin))
  if (base.protocol !== 'https:' && base.hostname !== 'localhost') throw new Error('Checkout links must use https.')
  return `${base.origin}/dl/${id}`
}

export function shortUrl(url) {
  const value = new URL(url)
  return `${value.host}${value.pathname}`
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

// A plain, accessible link styled as a button. No script, no iframe, no
// external stylesheet: it works in any website builder's HTML block.
export function buyButtonHtml({ url, label }) {
  const href = new URL(url)
  if (href.protocol !== 'https:' && href.hostname !== 'localhost') throw new Error('Checkout links must use https.')
  if (!/^\/dl\/[A-Za-z0-9_-]{1,80}$/.test(href.pathname) || href.search || href.hash) throw new Error('Not a checkout link.')
  const style = 'display:inline-block;padding:14px 24px;border-radius:999px;background:#16130f;color:#fffaf2;font:600 16px/1.2 system-ui,-apple-system,sans-serif;text-decoration:none'
  return `<a href="${escapeHtml(href.href)}" style="${style}">${escapeHtml(label)}</a>`
}

export function qrFileName(name, ext) {
  const slug = String(name || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return `nytto-checkout-${slug || 'product'}-qr.${ext === 'svg' ? 'svg' : 'png'}`
}
