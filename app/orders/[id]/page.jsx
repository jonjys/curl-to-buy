import { LocaleProvider } from '../../../components/locale'
import { Frame } from '../../../components/shell'
import OrdersBox from './orders-box'

export const dynamic = 'force-dynamic'

export default async function ItemOrdersPage({ params }) {
  const { id } = await params
  return <LocaleProvider><Frame><main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6"><OrdersBox id={id} /></main></Frame></LocaleProvider>
}
