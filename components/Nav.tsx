import Link from 'next/link'

export default function Nav() {
  return (
    <header
      style={{
        width: '100%',
        height: '56px',
        background: '#f8f5ef',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Link
        href="/"
        className="font-[family-name:var(--font-serif)]"
        style={{
          fontSize: '28px',
          color: '#1a3a2a',
          fontWeight: 400,
          textDecoration: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
        }}
      >
        Wander
      </Link>
    </header>
  )
}
