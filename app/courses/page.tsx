import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getStateName, isValidUSState, getStateSlug } from '@/lib/states'

export const metadata = {
  title: 'Browse Golf Courses by State | Wander',
  description: 'Find golf courses across all 50 states. Browse by state to discover courses near you.',
}

async function getStateStats() {
  const states = await prisma.$queryRaw<{ state: string; count: bigint }[]>`
    SELECT state, COUNT(*) as count
    FROM "Club"
    GROUP BY state
    ORDER BY state
  `

  // Filter to only valid US states and convert to full names
  return states
    .filter(s => isValidUSState(s.state))
    .map(s => ({
      state: getStateName(s.state),
      slug: getStateSlug(s.state),
      count: Number(s.count),
    }))
    .sort((a, b) => a.state.localeCompare(b.state))
}

export default async function BrowseStatesPage() {
  const states = await getStateStats()
  const totalCourses = states.reduce((sum, s) => sum + s.count, 0)

  return (
    <main className="min-h-screen bg-[#f8f5ef]">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <nav className="text-sm mb-4">
            <Link href="/" className="hover:underline">Home</Link>
            <span className="mx-2">/</span>
            <span>Courses</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-serif)] font-normal">
            Browse by State
          </h1>
          <p className="text-xl mt-4 text-white/80">
            {totalCourses.toLocaleString()} {totalCourses === 1 ? 'course' : 'courses'} across {states.length} {states.length === 1 ? 'state' : 'states'}
          </p>
        </div>
      </header>

      {/* States Grid */}
      <section className="max-w-6xl mx-auto py-12 px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {states.map((s) => (
            <StateCard
              key={s.state}
              state={s.state}
              slug={s.slug}
              count={s.count}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

function StateCard({ state, slug, count }: { state: string; slug: string; count: number }) {
  return (
    <Link
      href={`/courses/${slug}`}
      className="block p-6 bg-white border border-[#1a3a2a]/10 rounded-lg hover:border-[#c9a84c] hover:shadow-lg transition-all"
    >
      <h2 className="text-xl font-semibold text-[#1a3a2a]">{state}</h2>
      <p className="text-sm text-[#1a3a2a]/60 mt-1">
        {count.toLocaleString()} {count === 1 ? 'course' : 'courses'}
      </p>
    </Link>
  )
}
