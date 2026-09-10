import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5">
      <h1 className="font-display text-3xl tracking-tight">This link is not for sale.</h1>
      <Link href="/" className="mt-6 inline-flex min-h-11 w-fit items-center rounded-sm bg-ink px-4 text-sm font-medium text-paper no-underline">
        Back
      </Link>
    </div>
  )
}
