export function sameOrigin(req) {
  const origin = req.headers.get('origin')
  return !origin || origin === new URL(req.url).origin
}

export function privateJson(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}
