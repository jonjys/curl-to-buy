import { LocaleProvider } from '../../../components/locale'
import { Frame } from '../../../components/shell'
import OrdersBox from './orders-box'

export const dynamic = 'force-dynamic'

export default async function ItemOrdersPage({ params }) {
  const { id } = await params
  return <LocaleProvider><Frame><main className="ctb-gutter mx-auto w-full max-w-2xl flex-1 py-10 sm:py-16"><OrdersBox id={id} /></main></Frame></LocaleProvider>
}
