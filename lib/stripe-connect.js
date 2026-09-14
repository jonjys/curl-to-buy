import { stripe } from './stripe'
import { getSeller, updateSeller } from './store'
import { sellerIdFromRequest } from './seller'

const STRIPE_V2_VERSION = '2026-08-26.preview'

async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe is not configured.')
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Stripe-Version': STRIPE_V2_VERSION,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json?.error?.message || 'Stripe Connect request failed.')
  return json
}

async function createV1Express({ email, sellerId }) {
  const client = stripe()
  if (!client) throw new Error('Stripe is not configured.')
  return client.accounts.create({
    type: 'express',
    country: 'SE',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: { product_description: 'Digital file sales via Curl-to-Buy' },
    metadata: { curl_to_buy_seller_id: sellerId },
  })
}

export async function createConnectedRecipient({ email, sellerId }) {
  try {
    const account = await request('/v2/core/accounts', {
      method: 'POST',
      idempotencyKey: `ctb-seller-${sellerId}`,
      body: {
        contact_email: email,
        dashboard: 'express',
        identity: { country: 'se', entity_type: 'individual' },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
        defaults: {
          currency: 'usd',
          responsibilities: { fees_collector: 'application', losses_collector: 'application' },
          locales: ['sv-SE', 'en-US'],
        },
        metadata: { curl_to_buy_seller_id: sellerId },
        include: ['configuration.recipient', 'requirements'],
      },
    })
    return { ...account, connectVersion: 'v2' }
  } catch {
    const account = await createV1Express({ email, sellerId })
    return { ...account, connectVersion: 'v1' }
  }
}

export async function createOnboardingLink({ accountId, returnUrl, refreshUrl, connectVersion }) {
  if (connectVersion !== 'v1') {
    try {
      return await request('/v2/core/account_links', {
        method: 'POST',
        body: {
          account: accountId,
          use_case: {
            type: 'account_onboarding',
            account_onboarding: {
              collection_options: { fields: 'eventually_due' },
              configurations: ['recipient'],
              return_url: returnUrl,
              refresh_url: refreshUrl,
            },
          },
        },
      })
    } catch {
      // fall through to v1
    }
  }
  const client = stripe()
  if (!client) throw new Error('Stripe is not configured.')
  return client.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
}

export async function retrieveConnectedRecipient(accountId) {
  try {
    const query = new URLSearchParams()
    query.append('include[]', 'configuration.recipient')
    query.append('include[]', 'requirements')
    return await request(`/v2/core/accounts/${encodeURIComponent(accountId)}?${query}`)
  } catch {
    const client = stripe()
    if (!client) throw new Error('Stripe is not configured.')
    return client.accounts.retrieve(accountId)
  }
}

export function recipientStatus(account) {
  const v2 = account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active'
  const v1 = account?.capabilities?.transfers === 'active' || account?.payouts_enabled === true
  return { transfers: Boolean(v2 || v1) }
}

export async function loadReadySeller(req) {
  const id = sellerIdFromRequest(req)
  const seller = id ? await getSeller(id) : null
  if (!seller?.stripeAccountId) return null
  try {
    const status = recipientStatus(await retrieveConnectedRecipient(seller.stripeAccountId))
    if (!status.transfers) {
      if (seller.ready) await updateSeller(seller.id, { ready: false, transfers: false })
      return null
    }
    if (!seller.ready) await updateSeller(seller.id, { ready: true, ...status })
    return { ...seller, ready: true, ...status }
  } catch {
    return seller.ready ? seller : null
  }
}
