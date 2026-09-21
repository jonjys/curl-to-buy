# Overnight production hardening — pay.nyttolabs.com

> Historical overnight scan (2026-09-20) against the previous host/brand (`pay.nyttolabs.com` / Curl-to-Buy). Canonical product is now **GetPaidLink** at `https://getpaidlink.nyttolabs.com`. Curl examples below are the commands that were actually run.

Scanned 20 September 2026 against live `https://pay.nyttolabs.com` (Vercel production `dpl_D4qx11RXFqLXxULY2AecuvbRe6LM`, git `469cbb2` on `main`) and this follow-up hardening branch.

## Scorecard

| # | Item | Result |
| --- | --- | --- |
| 1 | Create → Stripe Connect end-to-end | **PASS** |
| 2 | Server price floors + application fees | **PASS** (contract + live gate) |
| 3 | Plans Subscribe opens Stripe | **PASS** |
| 4 | Physical item title + shipping address | **PASS** |
| 5 | Public page scan | **PASS** |
| 6 | Fixes on `main` / production | **PASS on git `main`** (`35b3575`). Live still `469cbb2` — Vercel Hobby 100-deploy/day cap. Connect already works on live. |
| 7 | Safe to attempt a real $10 test purchase | **YES** — after Fredrik finishes hosted Stripe onboarding (or uses an already-ready seller) |

## 1. Create → Stripe Connect — PASS

Live Create already returned a hosted Stripe URL. The previous `main` fix (`1b99287`) is deployed. This overnight pass still hardens the match so `account_links` always uses the live account’s configurations (merchant + customer for new SaaS direct-charge accounts), retries known combinations on `configs_must_match_to_use_account_links`, and only then falls back to v1.

### Live curl

```bash
curl -sS -X POST https://pay.nyttolabs.com/api/connect \
  -H 'Content-Type: application/json' \
  -d '{"email":"overnight-hardening-20260920@nyttolabs.com"}'
```

**200**

```json
{
  "url": "https://connect.stripe.com/setup/s/acct_1UHYg6B3OwzmLLDD/m5mj3iHXPFhx"
}
```

Repeat with the same email:

```bash
curl -sS -X POST https://pay.nyttolabs.com/api/connect \
  -H 'Content-Type: application/json' \
  -d '{"email":"overnight-hardening-20260920@nyttolabs.com"}'
```

**409** `{"error":"An existing seller uses this email. Recover your seller access by email.","needsRecovery":true}`

Payment-link create without a ready seller cookie is correctly refused (Connect first):

```bash
curl -sS -X POST https://pay.nyttolabs.com/api/register \
  -H 'Content-Type: application/json' \
  -d '{"requestId":"aaaaaaaaaaaaaaaa","accepted":true,"priceUsd":1,"files":[{"name":"a.txt","blobPathname":"uploads/a.txt","size":1,"type":"text/plain"}]}'
```

**403** `{"error":"Connect Stripe before creating a selling link."}`

### Regression

`tests/billing-foundations.test.mjs` now mocks `POST /v2/core/accounts` and `POST /v2/core/account_links`. Stripe returns 400 `configs_must_match_to_use_account_links` unless the link `configurations` are exactly the account’s `customer` + `merchant`. The helper and onboarding call both send that pair.

Physical Create no longer saves a draft and sits still when Stripe is not connected — it starts Connect (or asks for email). After return, the saved draft publishes.

## 2. Server price floors — PASS

| Seller | Min USD | Min SEK | `application_fee` |
| --- | ---: | ---: | ---: |
| Unsubscribed | $10 | 100 | 5% |
| Subscribed | $5 | 50 | 0% |

Live unauthenticated `$1` hits the Connect gate (**403**), not a silent publish. Authenticated floors are enforced in `parsePrice`, `publishListing`, and buyer checkout (`This link is below the current minimum price.`).

Contract proofs (`node --experimental-vm-modules --test tests/freemium-pricing.test.mjs`):

- Unsubscribed: `$1` and `$4.99` → **400**; `$10` → **200**, `billingMode=freemium`, `feeBps=500`, checkout `application_fee_amount=50` (5% of $10), direct charge (`stripeAccount=acct_merchant`, no `transfer_data`).
- Subscribed: `$1` and `$4.99` → **400**; `$5` → **200**, `billingMode=subscription`, `feeBps=0`, checkout `application_fee_amount=0`.
- Buyer checkout of a stored `$1` listing → **400**.
- Physical unsubscribed: empty title → **400**; `50 SEK` → **400**; titled `100 SEK` → **200**.

## 3. Plans Subscribe — PASS

```bash
curl -sS https://pay.nyttolabs.com/api/billing/plans
```

**200** `acceptingSubscriptions: true`, `source: "stripe"`, Start €5 / Grow €19 / Scale €49.

Choose Start/Grow/Scale is enabled when the catalog is live. Unauthenticated click collects email and POSTs `/api/connect` (proven 200 + Stripe URL). Already-connected sellers POST `/api/billing/checkout` which creates a Stripe Checkout Session. No cookie:

```bash
curl -sS -X POST https://pay.nyttolabs.com/api/billing/checkout \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://pay.nyttolabs.com' \
  -d '{"plan":"start"}'
```

**403** `{"error":"Add your payout details first.","needsConnect":true}` — expected; Subscribe does not stay disabled, it routes through Connect first.

## 4. Physical items — PASS

- Title required: UI (`< 3` chars) and `POST /api/register-item` (**400** for `""` / `"ab"`).
- Shipping included must be confirmed.
- Checkout sets `shipping_address_collection.allowed_countries` from the listing (contract: `SE`, plus phone collection).
- Live `POST /api/register-item` without a seller is **403** Connect-first, not a 500.

## 5. Public page scan — PASS

| Path | HTTP | Title |
| --- | ---: | --- |
| `/` | 200 | Curl-to-Buy — Sell an item or file with one link. |
| `/plans` | 200 | Subscription plans — Curl-to-Buy |
| `/links` | 200 | Saved links — Curl-to-Buy |
| `/upload` | 200 | Curl-to-Buy — Sell an item or file with one link. |
| `/terms` | 200 | Terms — Curl-to-Buy |
| `/privacy` | 200 | Privacy — Curl-to-Buy |
| `/refunds` | 200 | Refunds — Curl-to-Buy |

No 500s. Header/footer CTAs (`Create link`, `Subscriptions`, `My links`, legal, `www.nyttolabs.com`) are real routes. Homepage hero CTA jumps to `#post`. Plans Subscribe buttons are enabled (`acceptingSubscriptions: true`).

## 6. Merge / deploy

**Git `main` is merged:** https://github.com/jonjys/curl-to-buy/pull/25 → `fcd5a34` plus the follow-up item-form `catch` restore so `next build` succeeds.

Already proven on live before this overnight pass (production was `469cbb2`):

- `1b99287` Fix Connect account-link configs and live catalog read
- `b9bf421` / `197a6c5` Freemium $10/5% vs subscribed $5/0%
- Live `POST /api/connect` 200 + Stripe URL

This hardening is on `main` (`35b3575`: missing `catch` restored, `next build` green locally).

**Vercel production is still `469cbb2`.** The free Hobby account hit `api-deployments-free-per-day` (100/100, reset in ~24h). A production build of `fcd5a34` failed on the missing `catch`; that is fixed on `main` but cannot be deployed until the quota resets or Fredrik promotes from the Vercel dashboard / upgrades the plan. Live `pay.nyttolabs.com` stayed on the last good SHA and still returns a Stripe onboarding URL.

A second live probe after merge:

```bash
curl -sS -X POST https://pay.nyttolabs.com/api/connect \
  -H 'Content-Type: application/json' \
  -d '{"email":"overnight-hardening-20260920b@nyttolabs.com"}'
```

**200** `https://connect.stripe.com/setup/s/acct_1UHZ9NAy5KcWJmqz/AY5xkn4OHNvC`

## BLOCKED — Fredrik Dashboard

These cannot be finished from the agent (no hosted-onboarding identity, no portal write):

1. Open the Stripe URL from Create/Connect and finish identity + payouts until card payments are active (`configuration.merchant.capabilities.card_payments.status === active`).
2. Confirm Customer portal config `STRIPE_CTB_PORTAL_CONFIGURATION` if changing plans after subscribe (`bpc_…`).
3. Confirm connected-account webhook `https://pay.nyttolabs.com/api/stripe/connect-webhook` + `STRIPE_CTB_CONNECT_WEBHOOK_SECRET` (buyer success-page verification still records the sale if this is late).
4. Recover or ignore the overnight probe sellers:
   - `overnight-hardening-20260920@nyttolabs.com` / `acct_1UHYg6B3OwzmLLDD`
   - `overnight-hardening-20260920b@nyttolabs.com` / `acct_1UHZ9NAy5KcWJmqz`
5. **Vercel Hobby deploy cap** — `api-deployments-free-per-day` is exhausted. After reset (or from the Vercel dashboard), deploy `main` @ `35b3575` so physical Create→Connect and the stricter account_links matcher go live. Current production already has the original config-match fix and a working Connect URL.

## Safe to attempt a real $10 test purchase: YES

Fredrik can:

1. Open `/` or `/upload` → Create digital link at **$10** (or physical titled item at **100 SEK**).
2. Connect Stripe (email → hosted URL). The configurations-mismatch redirect bug is gone on live.
3. Finish Stripe’s form.
4. Return; the draft publishes a payment link.
5. Open the link and pay **$10** with a real card.

Do not try `$1` — the API returns **400** even if the UI is bypassed. Unsubscribed take rate is 5%; Start/Grow/Scale is 0% platform fee.

## Tests

```bash
node --experimental-vm-modules --test \
  tests/payment-flow.test.mjs \
  tests/physical-flow.test.mjs \
  tests/saved-links.test.mjs \
  tests/billing-foundations.test.mjs \
  tests/subscription-commerce.test.mjs \
  tests/freemium-pricing.test.mjs
```

**25/25 pass.** No App Store / make-it-real changes.
