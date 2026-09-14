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

export function createConnectedMerchant({ email, sellerId }) {
  return request('/v2/core/accounts', {
    method: 'POST',
    idempotencyKey: `ctb-seller-${sellerId}`,
    body: {
      contact_email: email,
      dashboard: 'full',
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      defaults: {
        responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
        locales: ['sv-SE', 'en-US'],
      },
      metadata: { curl_to_buy_seller_id: sellerId },
      include: ['configuration.merchant', 'requirements'],
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
          configurations: ['merchant'],
          return_url: returnUrl,
          refresh_url: refreshUrl,
        },
      },
    },
  })
}

export function retrieveConnectedMerchant(accountId) {
  const query = new URLSearchParams()
  query.append('include[]', 'configuration.merchant')
  query.append('include[]', 'requirements')
  return request(`/v2/core/accounts/${encodeURIComponent(accountId)}?${query}`)
}

export function merchantStatus(account) {
  const capabilities = account?.configuration?.merchant?.capabilities
  return {
    cardPayments: capabilities?.card_payments?.status === 'active',
    payouts: capabilities?.stripe_balance?.payouts?.status === 'active',
  }
}
