'use client'

export default function Error({ reset }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-4">
      <h1 className="font-display text-3xl font-black">Curl-to-Buy</h1>
      <p className="mt-3 text-sm text-ink-soft">This page could not be loaded. Try again.</p>
      <p className="mt-1 text-sm text-ink-soft">Sidan kunde inte laddas. Försök igen.</p>
      <button type="button" onClick={() => reset()} className="mt-6 inline-flex h-12 w-fit items-center rounded-sm bg-pine px-5 text-sm font-medium text-pine-fg">
        Try again
      </button>
    </main>
  )
}
