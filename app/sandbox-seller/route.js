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
export async function GET(req) {
  const blocked = guard(); if (blocked) return blocked
  const current = status(await stripe().accounts.retrieve(ACCOUNT))
  if (!(req.headers.get('accept') || '').includes('text/html')) return Response.json(current)
  const ready = current.charges_enabled
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Testsäljare</title><body style="font:16px system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem;background:#f6f0e6;color:#16130f">
<h1 style="font-size:1.5rem">Testsäljare (endast testläge)</h1>
<p>Status: <b>${ready ? 'klar' : 'inte klar'}</b></p>
${ready ? '<p>Klart. Gå tillbaka till chatten och skriv <b>klart</b>.</p>' : `<form method="post"><button style="font:600 16px system-ui;padding:14px 24px;border:0;border-radius:999px;background:#16130f;color:#fffaf2">Fyll i testsäljaren med Stripes testvärden</button></form>
<p style="color:#6b6258;font-size:14px">Använder bara Stripes påhittade testdata. Ingen riktig person, inga riktiga pengar och inget i produktion.</p>`}</body>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
export async function POST(req) {
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
    if ((req.headers.get('accept') || '').includes('text/html')) return Response.redirect(new URL(req.url).toString(), 303)
    return Response.json({ ok: true, ...status(updated) })
  } catch (error) {
    return Response.json({ ok: false, type: error.type, code: error.code, message: String(error.message || '').slice(0, 300) }, { status: 400 })
  }
}
