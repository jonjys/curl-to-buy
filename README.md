# Curl-to-Buy

https://pay.nyttolabs.com — Post an item. Get paid.

Create a payment link for a physical product or digital file. Buyers pay by **card** through Stripe. Sellers pay a monthly subscription (Start €5 / Grow €19 / Scale €49). Stripe deducts its processing fee from each sale. No Curl-to-Buy percentage on subscription links.

Env (already on the Vercel project):

- `STRIPE_SECRET_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_SITE_URL` (optional, defaults to https://pay.nyttolabs.com)

## Name restoration — 21 September 2026

The product is Curl-to-Buy again at `https://pay.nyttolabs.com`. The GetPaidLink
name has been withdrawn. This restores branding only; pricing, Stripe account IDs,
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
