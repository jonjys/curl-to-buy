import { SITE } from '../lib/site'

const PAGES = [
  { path: '', priority: 1 },
  { path: '/plans', priority: 0.8 },
  { path: '/threads', priority: 0.6 },
  { path: '/instagram', priority: 0.6 },
  { path: '/x', priority: 0.6 },
  { path: '/tiktok', priority: 0.6 },
  { path: '/terms', priority: 0.3 },
  { path: '/privacy', priority: 0.3 },
  { path: '/refunds', priority: 0.3 },
]

export default function sitemap() {
  return PAGES.map(({ path, priority }) => ({ url: `${SITE}${path}`, changeFrequency: 'weekly', priority }))
}
