import Link from 'next/link'

export default function Nav() {
  return (
    <header className="w-full h-14 bg-[#f8f5ef] flex items-center justify-center shrink-0">
      <Link
        href="/"
        className="font-[family-name:var(--font-serif)] text-[18px] md:text-[28px] text-[#1a3a2a] font-normal uppercase tracking-[0.15em] md:tracking-[0.25em]"
      >
        Wander Golf
      </Link>
    </header>
  )
}
