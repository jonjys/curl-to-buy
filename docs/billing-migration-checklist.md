# Subscription commerce release

Implementation continues PR #18 on top of main 2e0b34c. Production still runs main until this release is verified and merged. The user has requested subscription monetization, actual Stripe fee deduction, removal of the 5% promotion, and physical product links.

## Commercial model

The existing live catalog was rechecked on 19 September 2026:

| Plan | Monthly EUR, tax inclusive | New links per billing period | Lookup key |
| --- | ---: | ---: | --- |
| Start | 5 | 10 | ctb_start_monthly_v1 |
| Grow | 19 | 50 | ctb_grow_monthly_v1 |
| Scale | 49 | unlimited | ctb_scale_monthly_v1 |

A subscription is paid to Nytto Labs. New product sales are **direct charges** on the connected merchant. The server verifies Stripe fee collection and loss responsibility (`stripe`), active card payments, seller ownership and a paid, unexpired subscription. `application_fee_amount: 0` explicitly overrides any default application pricing. Stripe processing fees are charged by Stripe to the merchant; they are not an invented fixed platform percentage. Billing and Tax costs on the subscription itself remain costs of Nytto Labs.

## Existing merchants and purchases

The currently connected recipient accounts have platform fee responsibility. Stripe allows selecting the fee payer only at account creation. They are not silently reconfigured, deleted or replaced. Subscription setup creates a merchant/customer account with Stripe-owned fee collection; Stripe may require seller onboarding again. `paymentAccountId` is separate from the historical `stripeAccountId`.

New subscription listings store their merchant and billing model. Historical destination-charge links retain their old agreement and can still be purchased, verified and downloaded. Sellers can replace them with new subscription links. Historical purchases never require the seller to maintain an active subscription.

Every new Checkout session has a persisted context: listing, seller, account, amount, currency. Verification, download, order retrieval and connected events use that server-owned context. Never use an account ID supplied by a browser. Old sessions without context are retrieved on the platform, as before. Fully refunded/disputed charges are not downloadable.

## Enforced by the server

All three creation routes share subscription, age-consent, stable request ID and quota checks. Conditional ETag writes (supported by the installed @vercel/blob SDK) reserve quota slots atomically, including concurrent requests. Retrying one draft returns the same listing. Upgrades retain period usage; renewal starts a new ledger. Unlimited usage is tracked so downgrades cannot reset the count.

Limited subscription stock reserves a slot before returning Stripe Checkout. Only one open Checkout can hold the last slot. Stripe's status decides whether an expired slot can be reused. Completed payments remain sold even when the customer never returns to the app. Existing one-off legacy listings retain their previous stock behavior; new stock reservations are not retroactively applied to already open legacy Checkout sessions.

Addresses and phone numbers stay in Stripe and are retrieved only by the listing's authenticated seller. Public stock/usage/context records do not contain buyer PII. Existing seller/file storage design is unchanged except conditional updates and uncached reads.

## Remaining external release setup

1. Set a valid Stripe key for the intended mode in the deployment. Catalog lookup keys and products must exist on that SAME account/mode. The catalog route logs a sanitized diagnostic instead of hiding the reason behind an opaque 503. Do not replace a production key with a test key.
2. Create a **connected-account** webhook endpoint for `https://pay.nyttolabs.com/api/stripe/connect-webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Save its signing secret as `STRIPE_CTB_CONNECT_WEBHOOK_SECRET` in the matching Vercel environment. Keep the existing platform webhook and `STRIPE_CTB_WEBHOOK_SECRET` intact.
3. Create a Curl-to-Buy-only customer portal configuration. Allow payment method updates, invoice history, period-end cancellation and switching between the three verified prices. Immediate upgrades should invoice proration; downgrades should schedule at period end. Set `STRIPE_CTB_PORTAL_CONFIGURATION` to its ID. The connected Stripe tool currently denies portal configuration creation; no portal was created or bypass attempted.
4. Deploy a preview and verify catalog, merchant onboarding, subscription Checkout, portal, shipping, webhook delivery, inventory concurrency and legacy downloads against the intended Stripe environment. Do not treat mocked contracts as proof of a real bank payout.
5. Merge/deploy only when configured and verified. Until webhook and portal settings are present, new subscription payments remain unavailable; the public production site is not silently changed to a nonfunctional flow.

## Checks

`node --experimental-vm-modules --test tests/*.test.mjs`
`npm run build`

Automated contracts cover legacy destination payments/downloads, seller-only saved links, catalog validation, billing lifecycle, fee payer, direct account scope, shipping details, webhook account mismatches/retries, refunds, concurrent quotas and stock reservations. Tests use no keys or real charges.

## Scope

Product links can be embedded in another store. This release does not authorize Shopify API access, import products, sync supplier fulfillment or inventory, or charge buyers a recurring product subscription. Prices for physical products include shipping to the seller-selected countries. Sellers remain responsible for the product, delivery, returns, taxes and required customer information.

References: https://docs.stripe.com/connect/saas/tasks/accept-payment ; https://docs.stripe.com/connect/direct-charges-fee-payer-behavior ; https://docs.stripe.com/accounts-v2/use-accounts-as-customers
