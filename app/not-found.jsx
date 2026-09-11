import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5">
      <div className="nl-grid" aria-hidden="true" />
      <div className="relative z-10">
        <h1 className="font-display text-3xl font-black tracking-tight">This link is not for sale.</h1>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 w-fit items-center rounded-sm bg-pine px-4 text-sm font-medium text-pine-fg no-underline"
        >
          Back
        </Link>
      </div>
    </div>
  )
}
