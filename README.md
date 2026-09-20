# GetPaidLink

https://getpaidlink.nyttolabs.com — Get paid via a link.

Create a payment link — sell digital or physical without a full store. Buyers pay by **card** through Stripe. Sellers pay a monthly subscription (Start €5 / Grow €19 / Scale €49). Stripe deducts its processing fee from each sale. No GetPaidLink percentage on subscription links.

GetPaidLink is a Nytto Labs product. Package and repo names remain `curl-to-buy`.

Env (already on the Vercel project):

- `STRIPE_SECRET_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_SITE_URL` (optional, defaults to https://getpaidlink.nyttolabs.com)

## Domain cutover (Fredrik)

1. DNS: CNAME `getpaidlink.nyttolabs.com` → Vercel (`cname.vercel-dns.com`).
2. Vercel project: add domain `getpaidlink.nyttolabs.com` and set Production `NEXT_PUBLIC_SITE_URL=https://getpaidlink.nyttolabs.com`.
3. Redirect: keep `pay.nyttolabs.com` on the same project (or as a Vercel redirect domain) so it 308s to `https://getpaidlink.nyttolabs.com`. In-app host redirects live in `next.config.mjs`.
4. Stripe Dashboard: update platform and Connect webhook endpoints from `https://pay.nyttolabs.com/api/stripe/...` to `https://getpaidlink.nyttolabs.com/api/stripe/...` (or keep both until the old host is retired).
