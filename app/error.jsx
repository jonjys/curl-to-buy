'use client'

export default function Error({ reset }) {
  return (
    <main className="ctb-landing ctb-gutter mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center py-20">
      <p className="ctb-kicker text-muted">Nytto Checkout</p>
      <h1 className="ctb-title mt-3">This page could not be loaded.</h1>
      <p lang="sv" className="mt-4 text-lg text-ink-soft">Sidan kunde inte laddas. Försök igen.</p>
      <button type="button" onClick={() => reset()} className="ctb-btn ctb-btn-dark mt-8 w-fit">Try again / Försök igen</button>
    </main>
  )
}
