# Curl-to-Buy

https://pay.nyttolabs.com — Post an item. Get paid.

Create a payment link for a physical product or digital file. Buyers pay by **card** through Stripe. Sellers pay a monthly subscription (Start €5 / Grow €19 / Scale €49). Stripe deducts its processing fee from each sale. No Curl-to-Buy percentage on subscription links.

Env (already on the Vercel project):

- `STRIPE_SECRET_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_SITE_URL` (optional, defaults to https://pay.nyttolabs.com)
