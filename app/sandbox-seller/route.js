// SANDBOX TEST BRANCH ONLY. Never merge. Approved by the owner for the e2e test.
// Completes the e2e test seller's Stripe test-mode account with Stripe's
// documented test values, so no hosted onboarding (password, CAPTCHA) is needed.
// Returns status only. Refuses live keys, other branches and other accounts.
import { stripe } from '../../lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const ACCOUNT = 'acct_1UL7eEBS2oQj90JO'
const SELLER = '0RB87T_jeigtEWeRN7Ua8VGm'

function guard() {
  const env = process.env
  if (env.VERCEL_ENV !== 'preview' || env.VERCEL_GIT_COMMIT_REF !== 'claude/sandbox-e2e') return new Response('Not available.', { status: 404 })
  if (!/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY || '')) return new Response('Test key required.', { status: 403 })
  return null
}
function status(a) {
  return { id: a.id, livemode: a.livemode, charges_enabled: a.charges_enabled, card_payments: a.capabilities?.card_payments, currently_due: a.requirements?.currently_due, disabled_reason: a.requirements?.disabled_reason, errors: a.requirements?.errors?.map((e) => e.code) }
}
export async function GET() {
  const blocked = guard(); if (blocked) return blocked
  return Response.json(status(await stripe().accounts.retrieve(ACCOUNT)))
}
export async function POST() {
  const blocked = guard(); if (blocked) return blocked
  const client = stripe()
  const account = await client.accounts.retrieve(ACCOUNT)
  if (account.livemode || account.metadata?.curl_to_buy_seller_id !== SELLER) return new Response('Wrong account.', { status: 403 })
  try {
    const updated = await client.accounts.update(ACCOUNT, {
      business_profile: { mcc: '5734', product_description: 'Digital test products (sandbox e2e)', support_phone: '0000000000', url: 'https://accessible.stripe.com' },
      individual: {
        first_name: 'Test', last_name: 'Seller', email: 'e2e-seller@example.com', phone: '0000000000', nationality: 'SE',
        dob: { day: 1, month: 1, year: 1901 },
        address: { line1: 'address_full_match', city: 'Stockholm', postal_code: '11122', country: 'SE' },
      },
      tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: '8.8.8.8' },
      external_account: { object: 'bank_account', country: 'SE', currency: 'sek', account_number: 'SE3550000000054910000003' },
    })
    return Response.json({ ok: true, ...status(updated) })
  } catch (error) {
    return Response.json({ ok: false, type: error.type, code: error.code, message: String(error.message || '').slice(0, 300) }, { status: 400 })
  }
}
