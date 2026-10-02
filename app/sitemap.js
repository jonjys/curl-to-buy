import { SITE } from '../lib/site'

// Campaign paths (/threads, /instagram, /x, /tiktok) are tracking links with
// noindex and a canonical to the home page, so they are not listed here.
const PAGES = [
  { path: '', priority: 1 },
  { path: '/plans', priority: 0.8 },
  { path: '/terms', priority: 0.3 },
  { path: '/privacy', priority: 0.3 },
  { path: '/refunds', priority: 0.3 },
]

export default function sitemap() {
  return PAGES.map(({ path, priority }) => ({ url: `${SITE}${path}`, changeFrequency: 'weekly', priority }))
}
