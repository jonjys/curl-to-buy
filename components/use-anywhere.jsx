'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from './locale'
import { buyButtonHtml, checkoutUrl, qrFileName, shortUrl } from '../lib/share-kit'

const COPY = {
  en: {
    title: 'Add this product anywhere',
    lead: 'Put the checkout link behind a buy button, in a post or on a printed QR code. Every copy opens the same checkout.',
    copy: 'Copy link', copied: 'Copied', share: 'Share', open: 'Open checkout',
    qr: 'QR code', qrLead: 'For price tags, market stalls, posters, packaging or an invoice. It only contains the public checkout link.',
    png: 'Download PNG', svg: 'Download SVG', qrAlt: (name) => `QR code for ${name}`,
    button: 'Buy button for your website', buttonLead: 'Plain HTML. No script, works in any HTML or code block.',
    buyNow: 'Buy now', copyCode: 'Copy code', codeLabel: 'Buy button HTML',
    platforms: 'How to add it', noSync: 'Checkout, payment and stock are handled by Curl-to-Buy. Orders and stock do not sync back to Shopify, WooCommerce, Wix or Squarespace, so keep your store’s own stock in mind.',
    steps: [
      ['Shopify', 'In the theme editor, add a Custom Liquid section to the product page and paste the button code. Or paste it into a page or product description using the Show HTML button.'],
      ['WooCommerce', 'Edit the product or page and add a Custom HTML block with the button code. For a simple listing you can also create an External/Affiliate product and use the checkout link as the Product URL.'],
      ['Wix', 'Add an Embed HTML element and paste the button code, or add a Button and link it to the checkout link as a web address.'],
      ['Squarespace', 'Add a Button block that links to the checkout link, or add a Code block and paste the button code.'],
      ['Any website', 'Paste the code where the button should appear, or point any existing button or link at the checkout link.'],
    ],
    failed: 'Could not copy. Select the text and copy it manually.',
  },
  sv: {
    title: 'Lägg produkten var som helst',
    lead: 'Lägg checkout-länken bakom en köpknapp, i ett inlägg eller på en tryckt QR-kod. Alla vägar öppnar samma checkout.',
    copy: 'Kopiera länk', copied: 'Kopierad', share: 'Dela', open: 'Öppna checkout',
    qr: 'QR-kod', qrLead: 'För prislappar, marknadsstånd, affischer, förpackningar eller en faktura. Den innehåller bara den publika checkout-länken.',
    png: 'Ladda ner PNG', svg: 'Ladda ner SVG', qrAlt: (name) => `QR-kod för ${name}`,
    button: 'Köpknapp till din webbplats', buttonLead: 'Vanlig HTML. Inget skript, fungerar i alla HTML- eller kodblock.',
    buyNow: 'Köp nu', copyCode: 'Kopiera kod', codeLabel: 'HTML för köpknapp',
    platforms: 'Så lägger du in den', noSync: 'Checkout, betalning och lager hanteras av Curl-to-Buy. Ordrar och lager synkas inte tillbaka till Shopify, WooCommerce, Wix eller Squarespace, så håll koll på butikens eget lager.',
    steps: [
      ['Shopify', 'Lägg till en Custom Liquid-sektion på produktsidan i temaredigeraren och klistra in knappkoden. Eller klistra in den i en sida eller produktbeskrivning via knappen Visa HTML.'],
      ['WooCommerce', 'Redigera produkten eller sidan och lägg till ett Anpassad HTML-block med knappkoden. För en enkel produkt kan du också skapa en Extern/Affiliate-produkt och använda checkout-länken som produkt-URL.'],
      ['Wix', 'Lägg till ett Bädda in HTML-element och klistra in knappkoden, eller lägg till en knapp och länka den till checkout-länken som webbadress.'],
      ['Squarespace', 'Lägg till ett knappblock som länkar till checkout-länken, eller ett kodblock där du klistrar in knappkoden.'],
      ['Valfri webbplats', 'Klistra in koden där knappen ska synas, eller låt en befintlig knapp eller länk peka på checkout-länken.'],
    ],
    failed: 'Kunde inte kopiera. Markera texten och kopiera den manuellt.',
  },
}

async function copyText(text) {
  await navigator.clipboard.writeText(text)
}

function download(href, name) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function UseAnywhere({ id, name, priceLabel, className = '' }) {
  const { locale } = useLocale()
  const c = COPY[locale] || COPY.en
  const [origin, setOrigin] = useState('')
  const [qr, setQr] = useState({ svg: '', png: '' })
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { setOrigin(window.location.origin) }, [])
  const url = useMemo(() => (origin ? checkoutUrl(origin, id) : ''), [origin, id])
  const label = priceLabel ? `${c.buyNow} · ${priceLabel}` : c.buyNow
  const html = useMemo(() => (url ? buyButtonHtml({ url, label }) : ''), [url, label])

  useEffect(() => {
    if (!url) return undefined
    let live = true
    // Loaded on demand so pages without a QR code do not ship the encoder.
    import('qrcode').then(async (QRCode) => {
      const options = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#16130f', light: '#ffffff' } }
      const [svg, png] = await Promise.all([
        QRCode.toString(url, { ...options, type: 'svg' }),
        QRCode.toDataURL(url, { ...options, width: 1024 }),
      ])
      if (live) setQr({ svg: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, png })
    }).catch(() => {})
    return () => { live = false }
  }, [url])

  async function run(key, fn) {
    setError('')
    try { await fn(); setDone(key); setTimeout(() => setDone((current) => (current === key ? '' : current)), 1600) }
    catch (err) { if (err?.name !== 'AbortError') setError(c.failed) }
  }

  if (!url) return null
  const chip = 'inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-ink disabled:opacity-50'
  return (
    <section aria-label={c.title} className={`space-y-5 ${className}`}>
      <div>
        <h3 className="text-xl font-extrabold tracking-tight">{c.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{c.lead}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper-tint p-2 pl-4">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-soft">{shortUrl(url)}</span>
        <button type="button" className="ctb-btn ctb-btn-dark min-h-11 px-4 text-sm" onClick={() => run('link', () => copyText(url))}>{done === 'link' ? c.copied : c.copy}</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip} onClick={() => run('share', async () => { if (navigator.share) await navigator.share({ title: name, url }); else await copyText(url) })}>{done === 'share' ? c.copied : c.share}</button>
        <a className={`${chip} no-underline`} href={url} target="_blank" rel="noopener">{c.open} <span aria-hidden="true" className="ml-1">↗</span></a>
      </div>

      <div className="grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[9rem_1fr] sm:items-center">
        <div className="mx-auto aspect-square w-36 overflow-hidden rounded-xl border border-line bg-white">
          {qr.svg ? <img src={qr.svg} alt={c.qrAlt(name)} width="144" height="144" className="h-full w-full" /> : <div aria-hidden="true" className="h-full w-full animate-pulse bg-paper" />}
        </div>
        <div>
          <p className="font-bold">{c.qr}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{c.qrLead}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!qr.png} className={chip} onClick={() => download(qr.png, qrFileName(name, 'png'))}>{c.png}</button>
            <button type="button" disabled={!qr.svg} className={chip} onClick={() => download(qr.svg, qrFileName(name, 'svg'))}>{c.svg}</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="font-bold">{c.button}</p>
        <p className="mt-1 text-sm text-ink-soft">{c.buttonLead}</p>
        <div className="mt-4 flex justify-center rounded-xl bg-paper p-5">
          {/* The preview is the same plain link the seller copies. */}
          <a href={url} target="_blank" rel="noopener" style={{ display: 'inline-block', padding: '14px 24px', borderRadius: 999, background: '#16130f', color: '#fffaf2', font: '600 16px/1.2 system-ui,-apple-system,sans-serif', textDecoration: 'none' }}>{label}</a>
        </div>
        <label className="mt-4 block text-xs font-semibold text-muted" htmlFor={`embed-${id}`}>{c.codeLabel}</label>
        <textarea id={`embed-${id}`} readOnly value={html} rows={4} onFocus={(e) => e.target.select()} className="mt-1 w-full resize-none rounded-xl border border-line bg-paper-tint p-3 font-mono text-xs text-ink" />
        <button type="button" className={`${chip} mt-2`} onClick={() => run('code', () => copyText(html))}>{done === 'code' ? c.copied : c.copyCode}</button>
      </div>

      <details className="group rounded-2xl border border-line bg-white p-4">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between font-bold [&::-webkit-details-marker]:hidden">{c.platforms}<span aria-hidden="true" className="transition-transform group-open:rotate-45">+</span></summary>
        <dl className="mt-3 grid gap-3 text-sm">
          {c.steps.map(([platform, text]) => <div key={platform}><dt className="font-semibold">{platform}</dt><dd className="mt-0.5 leading-relaxed text-ink-soft">{text}</dd></div>)}
        </dl>
        <p className="mt-4 rounded-xl bg-[var(--ctb-peach)] p-3 text-sm leading-relaxed">{c.noSync}</p>
      </details>
      {error ? <p role="alert" className="text-sm text-warn">{error}</p> : null}
    </section>
  )
}
