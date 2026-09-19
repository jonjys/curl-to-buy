import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import SubscriptionPlans from '../../components/subscription-plans'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Subscription plans — Curl-to-Buy',
  description: 'Compare verified Curl-to-Buy subscription prices. Billing is not enabled in production yet.',
}

export default function PlansPage() {
  return (
    <LocaleProvider>
      <Frame>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
          <SubscriptionPlans />
        </main>
      </Frame>
    </LocaleProvider>
  )
}
