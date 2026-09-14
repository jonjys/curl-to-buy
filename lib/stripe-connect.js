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

export function createConnectedRecipient({ email, sellerId }) {
  return request('/v2/core/accounts', {
    method: 'POST',
    idempotencyKey: `ctb-seller-${sellerId}`,
    body: {
      contact_email: email,
      dashboard: 'express',
      identity: { country: 'se', entity_type: 'individual' },
      configuration: {
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
}

export function createOnboardingLink({ accountId, returnUrl, refreshUrl }) {
  return request('/v2/core/account_links', {
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
}

export function retrieveConnectedRecipient(accountId) {
  const query = new URLSearchParams()
  query.append('include[]', 'configuration.recipient')
  query.append('include[]', 'requirements')
  return request(`/v2/core/accounts/${encodeURIComponent(accountId)}?${query}`)
}

export function recipientStatus(account) {
  return {
    transfers: account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active',
  }
}
