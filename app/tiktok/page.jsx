import { HomePage, campaignMetadata } from '../../components/home-page'

export const dynamic = 'force-dynamic'
export const metadata = campaignMetadata()

export default function Page() {
  return <HomePage campaign="tiktok" />
}
