import { SITE } from '../lib/site'

// Public marketing pages may be indexed. Seller tools, buyer pages and APIs may not.
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/dl/', '/orders/', '/success', '/links', '/upload'] }],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
