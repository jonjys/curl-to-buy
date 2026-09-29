// SANDBOX TEST BRANCH ONLY. Never merge.
// Redirects to a fresh Stripe test-mode onboarding link for the e2e test seller,
// so a human can pass Stripe's CAPTCHA. Refuses live keys and other branches.
import { merchantOnboardingLink, retrieveConnectedRecipient } from '../../lib/stripe-connect'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const TEST_SELLER_ACCOUNT = 'acct_1UL7eEBS2oQj90JO'

export async function GET(req) {
  const env = process.env
  if (env.VERCEL_ENV !== 'preview' || env.VERCEL_GIT_COMMIT_REF !== 'claude/sandbox-e2e') return new Response('Not available.', { status: 404 })
  if (!/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY || '')) return new Response('Test key required.', { status: 403 })
  const account = await retrieveConnectedRecipient(TEST_SELLER_ACCOUNT)
  const link = await merchantOnboardingLink(TEST_SELLER_ACCOUNT, new URL(req.url).origin, account, 'sell')
  return Response.redirect(link.url, 303)
}
