import { getSeller, getVerificationCode, saveVerificationCode } from '../../../../lib/store'
import { emailKey, safeEqualStrings, sellerCookie, validSellerEmail, verificationCodeHash } from '../../../../lib/seller'

export const runtime = 'nodejs'

export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  const email = validSellerEmail(body.email)
  const code = String(body.code || '').trim()
  if (!email || !/^\d{6}$/.test(code)) {
    return Response.json({ error: 'Enter the 6-digit code.' }, { status: 400 })
  }

  const expected = verificationCodeHash(email, code)
  if (!expected) return Response.json({ error: 'Email delivery is not configured yet.' }, { status: 503 })

  const hash = emailKey(email)
  const record = await getVerificationCode(hash)
  if (!record || record.consumed || !Number.isInteger(record.expiresAt)) {
    return Response.json({ error: 'Code not found. Request a new one.' }, { status: 400 })
  }
  if (Date.now() > record.expiresAt) {
    return Response.json({ error: 'That code has expired. Request a new one.' }, { status: 410 })
  }
  if ((record.attempts || 0) >= 5) {
    return Response.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 })
  }

  if (!safeEqualStrings(expected, record.codeHash)) {
    await saveVerificationCode(hash, { ...record, attempts: (record.attempts || 0) + 1 })
    return Response.json({ error: 'Incorrect code.' }, { status: 400 })
  }

  const seller = await getSeller(record.sellerId)
  if (!seller) return Response.json({ error: 'Account not found.' }, { status: 404 })

  await saveVerificationCode(hash, { consumed: true })
  const response = Response.json({ ok: true })
  response.headers.append('Set-Cookie', sellerCookie(seller.id))
  return response
}
