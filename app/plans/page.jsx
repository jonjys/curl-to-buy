import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import SubscriptionPlans from '../../components/subscription-plans'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Subscription plans — Curl-to-Buy',
  description: 'Monthly plans for physical products and digital files. Choose Start, Grow or Scale.',
}

export default function PlansPage() {
  return (
    <LocaleProvider>
      <Frame>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
          <SubscriptionPlans />
        </main>
      </Frame>
    </LocaleProvider>
  )
}

