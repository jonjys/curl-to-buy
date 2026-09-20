# Subscription commerce release

Finishes PR #18 on `cursor/finish-seller-subscriptions-0135`. Production still runs main until this is merged. Live catalog was rechecked on 19 September 2026 against Stripe account `acct_1U1ToQBEo0Yzuylw`.

## Commercial model

| Plan | Monthly EUR, tax inclusive | New links per billing period | Lookup key | Live Price ID |
| --- | ---: | ---: | --- | --- |
| Start | 5 | 10 | `ctb_start_monthly_v1` | `price_1UH94rBEo0YzuylwfRdX935C` |
| Grow | 19 | 50 | `ctb_grow_monthly_v1` | `price_1UH95ABEo0Yzuylw3qTlybUT` |
| Scale | 49 | unlimited | `ctb_scale_monthly_v1` | `price_1UH95BBEo0Yzuylw7V505tem` |

A subscription is paid to Nytto Labs. New product sales are **direct charges** on a new merchant/customer connected account. The server verifies Stripe fee collection and loss responsibility (`stripe`), active card payments, seller ownership and a paid, unexpired subscription. `application_fee_amount: 0` overrides default application pricing. Stripe processing fees are charged to the merchant. Billing/Tax costs on the subscription itself remain Nytto Labs costs.

There is no GetPaidLink percentage on subscription links. Do not describe Stripe's card fee as a "5% platform fee".

## Existing merchants and purchases

Current recipient accounts have platform fee responsibility. Stripe sets the fee payer only at account creation. They are not deleted or silently reconfigured. Subscription setup creates a separate `paymentAccountId` with Stripe-owned fee collection. Historical destination-charge links keep their original agreement and stay purchasable, verifiable and downloadable. Historical purchases never require an active subscription.

## Catalog / preview

`/api/billing/plans` first retrieves the three live Price IDs above. If that environment cannot read them (test-mode key, missing key), it still returns the verified Start / Grow / Scale amounts so the page does not 503. Checkout stays closed until Stripe can read the catalog.

## Fredrik — Stripe Dashboard checklist

These writes are blocked from this agent (portal configuration permission denied; webhook secrets live in Vercel).

1. **Customer portal**  
   Dashboard → Settings → Billing → Customer portal. Create a configuration named “GetPaidLink seller subscriptions”. Enable payment-method update, invoice history, period-end cancel, and switching among the three prices above. Immediate upgrades should invoice prorations; downgrades should schedule at period end. Copy the configuration ID (`bpc_…`) into Vercel as `STRIPE_CTB_PORTAL_CONFIGURATION` for Production and Preview.

2. **Platform webhook (already live)**  
   Keep `https://getpaidlink.nyttolabs.com/api/stripe/webhook` and `STRIPE_CTB_WEBHOOK_SECRET`. Add events if missing: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`. Entitlements are also read live from Stripe on each publish. Until `pay.nyttolabs.com` 308-redirects, Stripe may still deliver to the old host — add the new URL in the Dashboard.

3. **Connected-account webhook (for new direct charges)**  
   Create a **connected account** endpoint: `https://getpaidlink.nyttolabs.com/api/stripe/connect-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Save its signing secret as `STRIPE_CTB_CONNECT_WEBHOOK_SECRET`. Buyer success-page verification still records the sale if this is late.

4. **Do not** replace the live Start / Grow / Scale prices, add a fourth tier, or change existing destination-charge links.

5. Preview `STRIPE_SECRET_KEY` must be the **same live account** as production if you want Checkout to open on preview. A test-mode key can display the fallback catalog but cannot charge the live prices.

6. After merge: open `/plans`, start Start Checkout, return via Customer Portal, create one digital and one physical link, confirm shipping address on `/orders/[id]`, and confirm an old destination-charge link still downloads.

## Server enforcement

All create-link routes share subscription, age-consent, stable request ID and quota checks. Conditional ETag writes reserve quota slots atomically. Retrying one draft returns the same listing. Swedish/English quota copy is returned when the monthly allowance is used.

Limited subscription stock reserves a slot before Stripe Checkout. Legacy listings keep previous stock behavior.

Addresses stay in Stripe and are retrieved only by the listing's authenticated seller.

## Checks

`node --experimental-vm-modules --test tests/*.test.mjs`  
`npm run build`

No keys or real charges in contract tests.

## Scope

This is a standalone payment-link flow. It does not import Shopify products or sync supplier inventory.
