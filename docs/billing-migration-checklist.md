# Curl-to-Buy release verification — 20 September 2026

## Actual state inspected

- Repository main: `133a2ba`. PR #18 is an older, conflicting draft; its implementation was superseded by #19 and later main commits.
- Production alias `pay.nyttolabs.com`: `469cbb2c2521ab2c0d70112159578815af7a1338`, deployment `dpl_D4qx11RXFqLXxULY2AecuvbRe6LM` (READY).
- Production `/api/billing/plans`: HTTP 200, Stripe catalog, previously `acceptingSubscriptions: true`. This does not prove purchase readiness.
- Stripe live account: `acct_1U1ToQBEo0Yzuylw` (Nytto Labs). Only live access is available to the Stripe connector. No real charge was made.
- Active monthly, tax-inclusive EUR prices and product metadata were re-read: Start €5 / 10 links (`price_1UH94rBEo0YzuylwfRdX935C`), Grow €19 / 50 (`price_1UH95ABEo0Yzuylw3qTlybUT`), Scale €49 / unlimited (`price_1UH95BBEo0Yzuylw7V505tem`). Lookup keys remain `ctb_{plan}_monthly_v1`.
- An active Swedish tax registration exists. Product tax codes are unset; the applicable account default and test tax result still need verification.
- v1 webhook endpoints and v2 event destinations both lack an enabled direct-payment fulfillment destination for `/api/stripe/connect-webhook`. The old account.updated endpoint is disabled. Vercel has a variable named `STRIPE_CTB_CONNECT_WEBHOOK_SECRET`; presence of a variable does not establish a working destination.
- The platform endpoint `we_1UDMsgBEo0YzuylwOhFhz9n0` receives payment events but lacks subscription/invoice events.
- Created a dedicated, non-default portal `bpc_1UHqEyBEo0Yzuylwswblrd7x`, scoped to the three products/prices, with invoice history, payment method updates, period-end cancellation, immediate prorated upgrades and period-end downgrades. The Vercel Production variable update was rejected by automatic approval review; it is NOT applied.
- Vercel Production and Preview share `BLOB_READ_WRITE_TOKEN`. Do not run test writes against the current Preview environment.

## Changes in the release-safety branch

- New subscriptions require `STRIPE_CTB_BILLING_ENABLED=true`, both webhook secrets and a named portal configuration. Preview with a live key cannot start subscriptions. Existing subscription reads and paid fulfillment remain available when new subscriptions are closed.
- Catalog validation enforces active price/product, app/plan ownership, exact agreed amount/quota, tax-inclusive monthly billing and matching live/test mode. Known IDs cannot bypass validation. Display fallback never enables checkout.
- Billing Checkout uses customer_update only with v1 customer, not customer_account. Existing unpaid subscriptions route to the named portal instead of opening another subscription.
- Signed billing events reconcile current Stripe state under a seller lock. Customer/mode mismatch retries with 503; duplicate event markers cannot grant entitlement. Server entitlement reads remain authoritative.
- Legacy checkout keeps its original destination and recorded fee (or the original seller fee), without subscription dependency or a newly imposed minimum. Subscription links pause when the subscription lapses instead of silently acquiring 5% commission.
- Limited legacy and direct listings reserve stock atomically. Expired checkouts release capacity; retrying the same expired browser attempt gets a fresh Stripe idempotency key. Completed delayed payments retain stock. Refunds never automatically restock a unique item.
- Seller dashboard adds loaded-link search/type filters, sales counts, native sharing and owner-checked pause/resume. Pausing blocks new checkout creation; existing checkout sessions and paid downloads remain valid.
- Physical form includes exact SEK price, synchronized slider/presets and buyer total. Optional HTTPS product URL and variant are manual references, with no server fetch or inventory/order synchronization.
- Paid download counters use conditional writes so concurrent downloads cannot exceed the allowance.

## Gates before enabling subscriptions

1. Approve applying the dedicated portal ID to Vercel Production. Do not reuse it in a test environment.
2. Provision an isolated Stripe sandbox, its matching prices/portal, separate Blob storage and matching signing secrets. Shared production/preview Blob credentials must be separated before test writes.
3. Configure the connected snapshot webhook with checkout.session.completed and checkout.session.async_payment_succeeded. Add customer.subscription.created/updated/deleted, invoice.paid and invoice.payment_failed to the existing platform endpoint while retaining its current payment events and secret.
4. Run real sandbox Checkout completion for physical and digital goods, direct-account fees and refunds/disputes, Billing Checkout, portal upgrades/downgrades/cancel/reactivation, signed delivery retries, concurrent stock and account recovery. Contract tests do not substitute for these checks.
5. Audit/migrate sensitive metadata and digital objects currently stored with `access: public`; authenticated API routes alone do not make the underlying blobs private. Do not claim complete storage privacy until this migration is verified.
6. Reconcile any legacy Checkout sessions created before stock reservations were deployed. Those sessions are not in the new reservation ledger. For a safe limited-stock cutover, stop new checkouts temporarily and let old sessions finish/expire; compare Stripe outcomes with purchase records before reopening.
7. Reconcile completed delayed-payment failures manually before reopening their stock. Restock refunded items only after the seller confirms the item is available. Use a new listing if necessary; do not decrement the sold counter blindly.
8. Enable new subscriptions only after these gates pass. No new live subscription purchase is part of verification.

## Fee responsibility

Historical destination charges debit Stripe processing fees/refunds/disputes from the platform; their original application fee remains in place. New direct charges use a merchant whose fee/loss responsibility is verified by the server. The merchant bears Stripe processing and direct-charge refund/dispute debits; the platform still pays its own subscription Billing/Tax and applicable platform costs. Never advertise a made-up universal Stripe percentage or exact seller net.

Sources: https://docs.stripe.com/connect/direct-charges and https://docs.stripe.com/connect/disputes and https://docs.stripe.com/connect/saas/tasks/refunds-disputes.

## Verification

`node --experimental-vm-modules --test tests/*.test.mjs` exercises source routes with isolated in-memory Stripe/Blob adapters. `npm run build` checks the actual Next.js production build. Live read-only HTTP checks are separate from contract payment tests. No claim of end-to-end live/sandbox payment completion is made.

## Follow-up — 21 September 2026

- PR #27 was merged by the user; production now serves `ff90dc4ae69719ee302f14b372166366162b3236` (READY).
- Platform webhook `we_1UDMsgBEo0YzuylwOhFhz9n0` now includes subscription created/updated/deleted and invoice paid/payment_failed, preserving existing events.
- Prepared connected-account endpoint `we_1UHzP9BEo0YzuylwsZctIFbi` at `/api/stripe/connect-webhook`, snapshot API `2026-07-29.dahlia`. It remains **disabled** until its own signing secret is deployed; this avoids delivering to an unrelated previously configured secret.
- Automatic approval review again rejected applying portal `bpc_1UHqEyBEo0Yzuylwswblrd7x` to Vercel Production, requiring explicit approval of that specific billing configuration change.
- No Curl-to-Buy subscriptions were returned by a complete live subscription listing. New billing remains disabled until the end-to-end gates above pass.
- Preview API requests now fail closed unless Stripe credentials are test credentials and the actual Blob token identifies a separate store matching `CTB_TEST_BLOB_STORE_ID`. The known production store is explicitly denied. The read-only plan catalog can still render. This guard does not provision a sandbox or migrate public files.
- Required user action: connect a Stripe sandbox to the Stripe connector. Preview needs that sandbox's restricted key and a distinct Blob store, not the current shared token.
