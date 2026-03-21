import Link from 'next/link'

const intents = [
  { number: "01", text: "Find my next round", href: "/courses" },
  { number: "02", text: "I'm planning a golf trip", href: "/courses" },
  { number: "03", text: "I want to find courses worth traveling for", href: "/courses" },
  { number: "04", text: "Show me something I've never heard of", href: "/courses" },
]

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col md:flex-row">
      {/* Image Panel - Top on mobile, Left on desktop */}
      <div className="relative h-[50vh] w-full md:h-auto md:flex-[0_0_60%]">
        <img
          src="/images/hero-homepage.png"
          alt="Golf course aerial view"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </div>

      {/* Content Panel */}
      <div className="flex-[0_0_40%] bg-[#f8f5ef] flex flex-col justify-center px-6 py-10 md:px-16 md:py-0">
        {/* Eyebrow */}
        <p className="text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] text-[#1a3a2a]/45 mb-6 whitespace-nowrap">
          Golf Course Guide
        </p>

        {/* Headline */}
        <h1 className="font-[family-name:var(--font-serif)] text-[28px] md:text-[36px] font-normal text-[#1a3a2a] leading-[1.25] mb-4">
          Where are you playing next?
        </h1>

        {/* Subhead */}
        <p className="font-[family-name:var(--font-sans)] text-[13px] md:text-[14px] font-light text-[#1a3a2a]/55 mb-7">
          Every course. Everywhere.
        </p>

        {/* Divider */}
        <div className="w-full h-px bg-[#1a3a2a]/12 mb-6 md:mb-8" />

        {/* Intent List */}
        <div>
          {intents.map((intent) => (
            <Link
              key={intent.number}
              href={intent.href}
              className="w-full flex items-center justify-between py-3 md:py-[14px] border-b border-[#1a3a2a]/8 hover:bg-[#c9a84c]/[0.06] transition-colors"
            >
              <div className="flex items-center whitespace-nowrap">
                <span className="text-[10px] tracking-[0.15em] text-[#c9a84c] mr-2 md:mr-4">
                  {intent.number}
                </span>
                <span className="font-[family-name:var(--font-sans)] text-[13px] md:text-[14px] font-normal text-[#1a3a2a]">
                  {intent.text}
                </span>
              </div>
              <span className="text-[14px] text-[#c9a84c] ml-2">→</span>
            </Link>
          ))}
        </div>

        {/* Bottom Stat */}
        <p className="mt-6 md:mt-8 text-[10px] uppercase tracking-[0.15em] text-[#1a3a2a]/35">
          30,000 courses · All 50 states
        </p>
      </div>
    </main>
  )
}
