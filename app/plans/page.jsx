import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import SubscriptionPlans from '../../components/subscription-plans'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Subscriptions | Nytto Checkout',
  description: 'Monthly plans for physical products and digital files. Choose Start, Grow or Scale.',
}

export default function PlansPage() {
  return (
    <LocaleProvider>
      <Frame>
        <main className="ctb-gutter mx-auto w-full max-w-7xl flex-1 py-10 sm:py-16">
          <SubscriptionPlans />
        </main>
      </Frame>
    </LocaleProvider>
  )
}

