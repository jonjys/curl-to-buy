import { HomePage, homeMetadata } from '../components/home-page'

export const dynamic = 'force-dynamic'
export const metadata = homeMetadata

export default function Page() {
  return <HomePage />
}
