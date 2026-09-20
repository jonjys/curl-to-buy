import { authenticatedSeller } from '../../../../lib/billing'
import { setListingPaused } from '../../../../lib/store'
import { privateJson, sameOrigin } from '../../../../lib/http'
export const runtime = 'nodejs'
export async function PATCH(req, { params }) {
  if (!sameOrigin(req)) return privateJson({ error: 'Invalid origin.' }, 403)
  try {
    const seller = await authenticatedSeller(req)
    if (!seller) return privateJson({ error: 'Sign in first.' }, 401)
    const body = await req.json().catch(() => ({}))
    if (typeof body.paused !== 'boolean') return privateJson({ error: 'Choose a valid status.' }, 400)
    const { id } = await params
    const result = await setListingPaused(id, seller.id, body.paused)
    return result ? privateJson(result) : privateJson({ error: 'Link not found.' }, 404)
  } catch { return privateJson({ error: 'Could not change link status.' }, 503) }
}
