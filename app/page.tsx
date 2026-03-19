const intents = [
  { number: "01", text: "Find my next round" },
  { number: "02", text: "I'm planning a golf trip" },
  { number: "03", text: "I want to find courses worth traveling for" },
  { number: "04", text: "Show me something I've never heard of" },
]

export default function HomePage() {
  return (
    <main style={{ display: 'flex', flex: 1, flexDirection: 'row' }}>
      {/* Left Panel - Image */}
      <div
        className="hidden md:block"
        style={{ flex: '0 0 60%', position: 'relative' }}
      >
        <img
          src="/images/hero-homepage.png"
          alt="Golf course aerial view"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </div>

      {/* Right Panel - Content */}
      <div
        style={{
          flex: '0 0 40%',
          background: '#f8f5ef',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '40px 32px',
        }}
        className="md:px-16 md:py-0"
      >
        {/* Eyebrow */}
        <p
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'rgba(26, 58, 42, 0.45)',
            marginBottom: '24px',
          }}
        >
          Golf Course Guide
        </p>

        {/* Headline */}
        <h1
          className="font-[family-name:var(--font-serif)]"
          style={{
            fontSize: '32px',
            fontWeight: 400,
            color: '#1a3a2a',
            lineHeight: 1.25,
            marginBottom: '16px',
          }}
        >
          Where are you playing next?
        </h1>

        {/* Subhead */}
        <p
          className="font-[family-name:var(--font-sans)]"
          style={{
            fontSize: '14px',
            fontWeight: 300,
            color: 'rgba(26, 58, 42, 0.55)',
            marginBottom: '28px',
          }}
        >
          Every course. Everywhere.
        </p>

        {/* Divider */}
        <div
          style={{
            width: '100%',
            height: '1px',
            background: 'rgba(26, 58, 42, 0.12)',
            marginBottom: '32px',
          }}
        />

        {/* Intent List */}
        <div>
          {intents.map((intent) => (
            <button
              key={intent.number}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0',
                borderBottom: '1px solid rgba(26, 58, 42, 0.08)',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                borderBottomStyle: 'solid',
                borderBottomWidth: '1px',
                borderBottomColor: 'rgba(26, 58, 42, 0.08)',
                transition: 'background-color 200ms',
              }}
              className="hover:bg-[#c9a84c]/[0.06]"
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.15em',
                    color: '#c9a84c',
                    marginRight: '16px',
                  }}
                >
                  {intent.number}
                </span>
                <span
                  className="font-[family-name:var(--font-sans)]"
                  style={{
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#1a3a2a',
                    textAlign: 'left',
                  }}
                >
                  {intent.text}
                </span>
              </div>
              <span style={{ fontSize: '14px', color: '#c9a84c' }}>→</span>
            </button>
          ))}
        </div>

        {/* Bottom Stat */}
        <p
          style={{
            marginTop: '32px',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(26, 58, 42, 0.35)',
          }}
        >
          30,000 courses · All 50 states
        </p>
      </div>
    </main>
  )
}
