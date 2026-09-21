import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import SubscriptionPlans from '../../components/subscription-plans'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Subscription plans — GetPaidLink',
  description: 'Create payment links with Start, Grow or Scale. Sell digital or physical without a full store.',
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

