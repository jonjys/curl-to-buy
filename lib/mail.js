// Minimal transactional email sender for the account-recovery flow, wired
// to Resend (a single fetch call, no SDK dependency needed). Swap the body
// of sendMail() if you use a different provider — everything that calls
// into this file only depends on mailConfigured()/sendMail().
//
// Not wired to a live provider as of this commit: RESEND_API_KEY is unset.
// Until it's set, /api/connect/recover-request logs the failure server-side
// and still returns its generic response (so it never leaks who's
// registered) — sellers simply won't receive a real email yet.

const FROM = process.env.MAIL_FROM || 'Curl-to-Buy <onboarding@resend.dev>'

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendMail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error('Email delivery is not configured (RESEND_API_KEY is unset).')
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Email send failed (${res.status}): ${text.slice(0, 300)}`)
  }
}

export async function sendRecoveryEmail(to, link) {
  await sendMail({
    to,
    subject: 'Recover access to your Curl-to-Buy payouts',
    html: `
      <p>Someone (hopefully you) asked to recover access to a Curl-to-Buy payout account linked to this address.</p>
      <p><a href="${link}">Restore access</a></p>
      <p>This link works once and expires in 30 minutes. If you didn't request this, you can ignore this email — nothing changes until the link above is used.</p>
    `.trim(),
  })
}
