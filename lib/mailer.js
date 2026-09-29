const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.RECOVER_EMAIL_FROM || 'Nytto Checkout <onboarding@resend.dev>'

export function emailReady() {
  return Boolean(RESEND_API_KEY)
}

export async function sendVerificationCode(email, code) {
  if (!RESEND_API_KEY) throw new Error('Email delivery is not configured.')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: `${code} is your Nytto Checkout code`,
      text: `Your Nytto Checkout verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email. Your account is unaffected.`,
    }),
  })
  if (!res.ok) throw new Error('Could not send the code. Try again in a moment.')
}
