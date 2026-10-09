# Nytto Checkout

https://pay.nyttolabs.com · One product. One checkout link.

Create a product, get one checkout link and put it anywhere: a bio, a post, a
QR code on a price tag or a buy button on your own website. Buyers pay by
**card** through Stripe, which processes every payment; Nytto Labs is not a
payment institution. Without a subscription each sale has a 5% platform fee.
Subscriptions (Start €5 / Grow €19 / Scale €49 a month) remove it. Stripe
deducts its processing fee from each sale.

Env (already on the Vercel project): see `.env.example`.

## Status (9 October 2026)

**Live and taking payments.** Sellers connect Stripe, buyers pay by card in
Stripe Checkout, digital files are delivered after payment and physical orders
collect a shipping address. The whole flow was tested end to end in Stripe test
mode, and Production was checked after the `source` metadata change (#44).

**Maintenance mode.** Existing links, checkout, webhooks and downloads keep
working. Only bug and security fixes are made; no new features are planned.
Open fixes are tracked in #52 (errors shown to paying buyers in
`/api/download` and `/api/verify-session` first).

## Names

The public name is **Nytto Checkout** (earlier: Curl-to-Buy, and briefly
GetPaidLink). Only visible text changed. Internal names stay as they are so
nothing breaks: `CTB_*` and `STRIPE_CTB_*` variables, Stripe metadata
(`app: curl_to_buy`), lookup keys (`ctb_*_monthly_v1`), webhooks, API routes,
`/dl/[id]` links, Blob paths, browser storage keys and existing orders.

## Campaign links

Each link shows the same landing page. Every path is counted separately in
Web Analytics, points search engines at `https://pay.nyttolabs.com/` and is
`noindex, follow`. Any other path is a normal 404.

| Channel   | Link                               | `source` |
|-----------|------------------------------------|----------|
| Threads   | https://pay.nyttolabs.com/threads   | threads   |
| Instagram | https://pay.nyttolabs.com/instagram | instagram |
| X         | https://pay.nyttolabs.com/x         | x         |
| TikTok    | https://pay.nyttolabs.com/tiktok    | tiktok    |

UTM tags also work on any page, for example
`https://pay.nyttolabs.com/instagram?utm_source=instagram&utm_medium=social&utm_campaign=launch&utm_content=story-1`.
Only `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and `utm_term`
are kept; every other query parameter is removed before anything is sent.

## Analytics

Vercel Web Analytics (`@vercel/analytics`) is the only analytics. It is off
until you enable it: Vercel Dashboard → project **curl-to-buy2.0** →
**Analytics** tab → **Enable**. Data is collected from the next production
deployment on.

Where to look (Vercel Dashboard → project → **Analytics**, Production):

- **Pageviews per channel:** the **Pages** panel. `/threads`, `/instagram`,
  `/x` and `/tiktok` are separate rows. Product pages show as `/dl/[id]`.
- **Referrers:** the **Referrers** panel (for example `l.instagram.com`,
  `t.co`, `threads.net`).
- **UTM:** the **UTM Parameters** panel, if your plan includes it.
- **Events:** the **Events** panel. Click an event to break it down by its
  properties. Custom events need a plan that includes them (Pro or higher);
  on other plans the calls are simply ignored.

| Event                    | When                                                  | Properties |
|--------------------------|-------------------------------------------------------|------------|
| `campaign_landing`       | A campaign path or allowlisted `utm_source` is opened | source |
| `create_link_clicked`    | A "Create" button on the landing page or header       | source, location |
| `stripe_connect_started` | The seller is sent to Stripe to connect               | source, location |
| `product_created`        | A product was saved and its checkout link is ready    | source, item_type, currency |
| `checkout_viewed`        | A buyer opens a checkout page                         | source, item_type, currency, location |
| `checkout_started`       | A buyer is sent to Stripe Checkout                    | source, item_type, currency, location |
| `qr_downloaded`          | A QR code was downloaded                              | source, location, format |
| `embed_copied`           | The buy button HTML was copied                        | source, location |

`source` is only ever `threads`, `instagram`, `x` or `tiktok`. No event or page
URL carries an email, a name or address, a product or file name, a full
checkout URL, a seller, order, session or Stripe ID, or a storage path.
Analytics never blocks creating a product, checkout, webhooks or delivery.
No purchase event is sent to Vercel.

**Sales per channel come from Stripe, not from Vercel.** When a seller creates
a product in a tab that arrived via a campaign path or allowlisted `utm_source`,
the listing stores that `source`. Every Checkout Session for the product, and
its PaymentIntent, then carries `metadata.source`. In the Stripe Dashboard,
filter payments by metadata `source` (`threads`, `instagram`, `x`, `tiktok`).
Products without a campaign source carry no `source` key. This works on every
Vercel plan and counts each payment exactly once, because Stripe is the record.

## Name restoration — 21 September 2026 (history)

On this date the product went back from GetPaidLink to Curl-to-Buy at
`https://pay.nyttolabs.com`; it has since been renamed Nytto Checkout (see
[Names](#names)). The GetPaidLink name has been withdrawn. This restores branding only; pricing, Stripe account IDs,
storage, subscriptions, seller cookies and existing listing IDs are unchanged.

- Keep `pay.nyttolabs.com` attached to Production, with no Vercel domain redirect.
- Set Production `NEXT_PUBLIC_SITE_URL=https://pay.nyttolabs.com` and redeploy.
  The code also normalizes the withdrawn host if an old environment value remains.
- Keep `getpaidlink.nyttolabs.com` attached temporarily as a serving alias, without
  redirects. Browsers may have cached the previous permanent pay → getpaidlink
  redirect; immediately reversing it would create a redirect loop.
- API routes and webhook POSTs are served directly on both hosts. Before removing
  the temporary alias, verify Stripe endpoint destinations and any outstanding
  Checkout/Connect return links; retain existing endpoint signing secrets.
- Checkout/Connect requests arriving on the temporary alias now get return URLs
  on `pay.nyttolabs.com`. Preview deployments retain their own origin and isolation.
