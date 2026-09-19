# Curl-to-Buy: no-per-sale-fee subscription migration

Status: **NOT ACTIVE IN PRODUCTION**. This document does not authorize changing connected-account responsibilities or collecting seller subscriptions.

## Verified current state (19 September 2026)

The current buyer checkout uses **Stripe Connect destination charges** with `payment_intent_data.application_fee_amount = seller.feeBps` (normally 500 bps/5%, with a pre-existing seller exception) and `transfer_data.destination`. This 5% is a **Curl-to-Buy service fee**, not the Stripe card-processing charge. Stripe debits processing fees, refunds and disputes to the **Nytto Labs platform account** on destination charges. Setting the application fee to zero would expose the platform to per-sale costs. Never rename this to a Stripe fee or promise that sellers automatically pay actual Stripe costs while retaining this charge type.

Nytto Labs live Stripe currently contains these **existing, not-yet-wired-in** subscription products and prices:

| Plan | Monthly price | Product metadata: new links/month | Stripe price lookup key |
| --- | ---: | ---: | --- |
| Start | €5 | 10 | `ctb_start_monthly_v1` |
| Grow | €19 | 50 | `ctb_grow_monthly_v1` |
| Scale | €49 | unlimited | `ctb_scale_monthly_v1` |

The user has also suggested different FOUR-tier examples ($5/20, $25/100, €50/250, $100/unlimited). These are **not the existing Stripe prices**. Confirm one currency, tier names, number of links, tax treatment and actual pricing before modifying live Stripe products or advertising alternative amounts. The app reads verified Stripe prices and product metadata rather than inventing displayed prices.

## Implemented only for isolated testing

`/plans` and `/api/billing/plans` read existing Stripe subscriptions catalog and present it as **not purchasable in production**. `/api/billing/checkout`, `/api/billing/status`, and `/api/billing/portal` implement authenticated seller-owned billing flows. Sandbox checkout and portal remain strictly locked unless ALL are true:

- `STRIPE_SECRET_KEY` begins with `sk_test_`.
- `CTB_BILLING_SANDBOX_ENABLED=true`.
- `CTB_BILLING_STORAGE_ISOLATED=true` with a physically separate, confirmed sandbox Blob store and test-only sellers. Merely setting the variable is not proof of isolation.
- Test-mode Stripe prices exist with the exact `ctb_*_monthly_v1` lookup keys, monthly EUR recurrence, plan metadata and link-limit product metadata. Never reuse the LIVE price IDs as test IDs.

The live checkout remains unchanged, as do existing seller entitlements, contract terms, seller accounts, and already-created links. Billing subscription and link-count entitlements are NOT enforced in production; nobody should be billed until all gates below pass.

## Gates to finish before launching subscriptions

1. **Choose and verify the final business model.** Agree on actual subscription tiers and VAT-inclusive/exclusive prices and update live Stripe prices without silently changing existing commitments.
2. **Migrate seller payments to direct charges with Stripe-owned pricing** (`fees_collector: stripe`) and suitable loss-liability/account configuration, only after account- and jurisdiction-specific Stripe review. Existing recipient/Express accounts have `fees_collector: application`; do not assume they can be changed in place. Seller re-onboarding may be required.
3. **Rewrite all direct-charge read paths consistently.** Creating Checkout on a connected account needs the appropriate `stripeAccount` context; verify-session, seller orders, download entitlements, refunds and dispute operations need the same connected-account context. Add Connect event delivery and its own webhook signing secret; verify account identity against stored seller ID and listing ID. Keep historical platform destination-charge purchases readable. Do not blindly mix test and live objects.
4. **Actual fee and loss accounting.** Verify sample SEK/USD/EUR cards and fee payer from real Stripe balance transactions; reconcile processing fees, refunds, Connect charges, disputes, VAT and currency conversion. Only then advertise `0% Curl-to-Buy transaction fee; sellers pay Stripe fees` with appropriate qualification.
5. **Durable plan enforcement.** Enforce monthly link quotas for ALL listing creation paths on the server using an atomic database counter/transaction, including concurrent requests, renewal boundaries, upgrades, cancellations, failed invoices and grace periods. Vercel Blob listing counts alone are not a safe concurrency lock.
6. **End-to-end isolated test.** Subscription signup, renewal, invoice failure, cancellation, Seller Connect onboarding, physical item purchase (and sold-out concurrency), digital download, orders, refund/chargeback, customer portal, webhook retries. Only production-enable after all pass.

Stripe docs: https://docs.stripe.com/connect/saas/tasks/accept-payment ; https://docs.stripe.com/connect/marketplace/tasks/accept-payment/destination-charges ; https://docs.stripe.com/connect/integrate-billing-connect ; https://stripe.com/connect/pricing
