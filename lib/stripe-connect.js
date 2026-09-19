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

export function accountLinkConfigurations(account) {
  const keys = ['merchant', 'customer', 'recipient']
  const found = keys.filter((key) => account?.configuration?.[key])
  return found.length ? found : ['merchant', 'customer']
}

async function accountForLink(accountId, account) {
  const hasMerchant = Boolean(account?.configuration?.merchant)
  const hasOther = Boolean(account?.configuration?.customer || account?.configuration?.recipient)
  if (hasMerchant && hasOther) return account
  return retrieveConnectedRecipient(accountId)
}

async function createV2AccountLink(accountId, { returnUrl, refreshUrl, fields = 'currently_due', account }) {
  const configurations = accountLinkConfigurations(await accountForLink(accountId, account))
  return request('/v2/core/account_links', {
    method: 'POST',
    body: {
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations,
          collection_options: { fields },
          return_url: returnUrl,
          refresh_url: refreshUrl,
        },
      },
    },
  })
}

export async function createOnboardingLink({ accountId, returnUrl, refreshUrl, connectVersion }) {
  if (connectVersion !== 'v1') {
    try {
      return await createV2AccountLink(accountId, { returnUrl, refreshUrl, fields: 'eventually_due' })
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
    query.append('include[]', 'configuration.merchant')
    query.append('include[]', 'configuration.customer')
    query.append('include[]', 'defaults')
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

// Subscription merchants pay their own Stripe costs. Fee responsibility is
// immutable, so an old recipient account is retained for historical purchases.
export async function createSubscriptionMerchant({ email, sellerId }) {
  return request('/v2/core/accounts', {
    method: 'POST', idempotencyKey: `ctb-merchant-v1-${sellerId}`,
    body: {
      contact_email: email,
      dashboard: 'full',
      identity: { country: 'se' },
      configuration: {
        merchant: { capabilities: { card_payments: { requested: true } } },
        customer: { capabilities: { automatic_indirect_tax: { requested: true } } },
      },
      defaults: {
        currency: 'sek', locales: ['sv-SE', 'en-US'],
        responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
      },
      metadata: { curl_to_buy_seller_id: sellerId },
      include: ['configuration.merchant', 'configuration.customer', 'defaults', 'requirements'],
    },
  })
}

export async function merchantOnboardingLink(accountId, origin, account) {
  const returnUrl = `${origin}/plans?stripe=return`
  const refreshUrl = `${origin}/plans?stripe=refresh`
  try {
    return await createV2AccountLink(accountId, { returnUrl, refreshUrl, fields: 'currently_due', account })
  } catch {
    const client = stripe()
    if (!client) throw new Error('Stripe is not configured.')
    return client.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })
  }
}

export function merchantStatus(account) {
  const fees = account?.defaults?.responsibilities?.fees_collector
    || account?.controller?.fees?.payer
  const losses = account?.defaults?.responsibilities?.losses_collector
    || account?.controller?.losses?.payments
  const cards = account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active'
    || account?.charges_enabled === true
  return { ready: Boolean(cards && ['stripe', 'account'].includes(fees) && losses === 'stripe'),
    feesPaidBySeller: ['stripe', 'account'].includes(fees) }
}

export async function readySubscriptionMerchant(seller) {
  if (!seller?.paymentAccountId) return null
  const account = await retrieveConnectedRecipient(seller.paymentAccountId)
  if (account.metadata?.curl_to_buy_seller_id !== seller.id || !merchantStatus(account).ready) return null
  return account
}

export async function loadReadySeller(req) {
  const id = sellerIdFromRequest(req)
  const seller = id ? await getSeller(id) : null
  if (!seller || !(await readySubscriptionMerchant(seller))) return null
  return { ...seller, ready: true }
}
