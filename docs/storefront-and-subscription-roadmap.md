# Curl-to-Buy: storefront connections and subscription pricing (proposal, NOT enabled)

This is the existing Curl-to-Buy product, not a new repository. Physical items and digital files share a checkout-link concept. Stripe Connect seller onboarding is NOT a Shopify/WooCommerce store connection.

## Product modes

- One-off item: title, condition, image, shipping/pickup terms, quantity (default one), purchaser shipping details, seller order dashboard.
- Digital download: preserve present file upload, per-purchaser entitlements and limits.
- Simple payment: optional future distinct mode with a clear description; never disguise donations, restricted goods or tips as item orders.
- Existing-store import: permissioned Shopify/WooCommerce integration, seller ownership verification, inventory source of truth, variant mapping, fulfillment sync, refund/return ownership. Manual listing remains usable with no store.

## Billing migration (proposal only)

- Introduce stable seller identity, server-verified Stripe Billing Customer + subscription, plan entitlements from webhooks, customer portal, grace/dunning/cancel/downgrade semantics, immutable per-order pricing snapshot and migration of existing sellers. Never treat a self-declared plan in the browser as permission to pay a lower fee.
- Illustrative options for validation, NOT published prices: Free: existing 5% per-sale; Starter: 99 SEK/month with a lower transaction fee; Pro: 299 SEK/month with 0% *platform* fee and higher link/automation limits. Alternatively all-paid plans if chosen after user research. Stripe processing, Connect, refunds, currency conversion, and disputes remain real costs.
- Current destination charges charge processing fees and refund/chargeback exposure to the *platform*. Removing application_fee_amount does NOT automatically make Stripe deduct its processing fees from the seller. Before promising seller net = price minus actual Stripe fees, implement Stripe-supported cost pass-through or an explicitly disclosed/accurately calculated seller deduction, validate account capabilities and reconcile actual Stripe balance transactions. Do not silently change existing fee contracts.

## UX

- Price number field plus a synced mobile-friendly range slider and sensible presets; maintain server-side currency, minimum and precision validation.
- Seller dashboard: listing state, paid orders, delivery address, fulfillment tracking, source-store linkage, duplicate-sale protection, privacy/retention and notifications.
- Differentiator: a link which turns SOLD across connected channels and preserves a minimal, audit-friendly paid-order record. Do not imply escrow, buyer protection or automatic fulfillment.

## Release gates for PR #15

1. Transactional stock reservation or equivalent durable checkout concurrency control: two open checkout sessions must not both complete for one item; handle abandoned sessions, webhooks and refunds safely.
2. Isolated test-mode Connect + Stripe Billing + storage E2E; test correct webhook signatures, idempotency, physical buyer information, digital entitlements, subscription lifecycle and partial failure.
3. Stripe platform/category approval as applicable; Swedish/EU physical-goods, consumer information, return, tax and privacy terms; clearly distinguish private vs business sellers.
4. Production fee and payout economics based on real Stripe statement, with appropriate seller disclosures.
5. Explicit deployment go/no-go: keep pay.nyttolabs.com on main until all release gates pass. Preview builds are not live launches.
