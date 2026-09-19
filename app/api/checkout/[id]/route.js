import { stripe } from '../../../../lib/stripe'
import { getListing, getSalesCount, getSeller, listingFiles } from '../../../../lib/store'
import { displayPrice } from '../../../../lib/price'
import { originFrom } from '../../../../lib/site'
import { applicationFeeCents } from '../../../../lib/fees'
import { billingState } from '../../../../lib/billing'
import { checkoutFeeBps, isSubscribed, saleTerms } from '../../../../lib/entitlement'
import { saveCheckoutContext } from '../../../../lib/payment-context'
import { createReservedCheckout } from '../../../../lib/checkout-reservations'
import { recipientStatus, retrieveConnectedRecipient, readySubscriptionMerchant } from '../../../../lib/stripe-connect'

export const runtime = 'nodejs'

export const maxDuration = 60
export async function POST(req, { params }) {
  try {
  const { id } = await params
  const client = stripe()
  if (!client) return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })

  const listing = await getListing(id)
  if (!listing) return Response.json({ error: 'This link is not for sale.' }, { status: 404 })
  const isPhysical = listing.kind === 'physical'
  if (isPhysical && (listing.shippingIncluded !== true || !Array.isArray(listing.shippingCountries) || !listing.shippingCountries.length)) {
    return Response.json({ error: 'Shipping is not configured for this item.' }, { status: 400 })
  }

  if (Number.isInteger(listing.salesLimit)) {
    const sold = await getSalesCount(id)
    if (sold >= listing.salesLimit) {
      return Response.json({ error: 'Sold out — this link reached its purchase limit.' }, { status: 410 })
    }
  }

  if (Number.isInteger(listing.expiresAt) && Date.now() > listing.expiresAt) {
    return Response.json({ error: 'This offer has expired.' }, { status: 410 })
  }

  const price = displayPrice(listing)
  if (!price.amount || price.amount < 100) {
    return Response.json({ error: 'This link does not have a valid price.' }, { status: 400 })
  }

  const seller = listing.sellerId ? await getSeller(listing.sellerId) : null
  if (!seller?.paymentAccountId && !seller?.stripeAccountId) {
    return Response.json({ error: 'The seller has not finished payout setup yet.' }, { status: 409 })
  }
  const billing = await billingState(seller)
  const subscribed = isSubscribed(billing)
  const terms = saleTerms(subscribed)
  const feeBps = checkoutFeeBps(subscribed, seller)
  const minCents = price.currency === 'sek' ? terms.minSek * 100 : terms.minUsd * 100
  if (price.amount < minCents) {
    return Response.json({ error: 'This link is below the current minimum price.' }, { status: 400 })
  }
  const accountId = listing.paymentAccountId || null
  const direct = Boolean(accountId)
  if (direct && (accountId !== seller.paymentAccountId || !(await readySubscriptionMerchant(seller)))) {
    return Response.json({ error: 'This seller is not accepting payments right now.' }, { status: 409 })
  }
  let destination = null
  if (!direct) try {
    const status = recipientStatus(await retrieveConnectedRecipient(seller.stripeAccountId))
    if (status.transfers) destination = seller.stripeAccountId
  } catch {}
  if (!direct && !destination) {
    return Response.json({ error: 'The seller has not finished payout setup yet.' }, { status: 409 })
  }

  const origin = originFrom(req)
  const fileCount = listingFiles(listing).length
  const checkoutParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: price.currency,
        unit_amount: price.amount,
        product_data: {
          name: listing.name,
          description: isPhysical
            ? 'Physical item · shipping included in price'
            : fileCount > 1 ? `${fileCount} digital files via Curl-to-Buy` : 'Digital file via Curl-to-Buy',
          ...(isPhysical && listing.photoUrl ? { images: [listing.photoUrl] } : {}),
        },
      },
    }],
    ...(isPhysical ? {
      shipping_address_collection: { allowed_countries: listing.shippingCountries },
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
    } : {}),
    payment_intent_data: {
      application_fee_amount: applicationFeeCents(price.amount, feeBps),
      ...(!direct ? { transfer_data: { destination } } : {}),
      metadata: { file_id: listing.id, seller_id: seller.id, billing_mode: listing.billingMode || (direct ? 'subscription' : 'legacy') },
    },
    success_url: `${origin}/success?listing_id=${listing.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dl/${listing.id}`,
    metadata: {
      file_id: listing.id, // Retained for the existing signed fulfillment webhook.
      seller_id: seller.id,
      kind: isPhysical ? 'physical' : 'digital',
      payout: 'connect',
      fee_bps: String(feeBps),
      billing_mode: listing.billingMode || (direct ? 'subscription' : 'legacy'),
    },
  }
  const body = await req.json().catch(() => ({}))
  const attemptId = body.attemptId
  const context = { accountId, listingId: listing.id, sellerId: seller.id, amount: price.amount, currency: price.currency }
  let session
  if (direct && Number.isInteger(listing.salesLimit)) {
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(attemptId || '')) return Response.json({ error: 'Refresh the item page and try again.' }, { status: 400 })
    session = await createReservedCheckout(client, listing, attemptId, checkoutParams, context)
  } else {
    session = await client.checkout.sessions.create(checkoutParams, direct ? { stripeAccount: accountId } : {})
    await saveCheckoutContext(session.id, context)
  }
  return Response.json({ url: session.url })
  } catch (error) {
    console.error('Buyer checkout failed', { type: error.type || error.name })
    return Response.json({ error: error.status ? error.message : 'Could not open checkout. Please try again.' }, { status: error.status || 503 })
  }
}

