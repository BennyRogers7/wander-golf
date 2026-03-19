import Link from 'next/link'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getStateName, getStateAbbrev, isValidUSState } from '@/lib/states'

interface StatePageProps {
  params: Promise<{ state: string }>
}

function formatSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export async function generateMetadata({ params }: StatePageProps) {
  const { state } = await params
  const stateName = getStateName(formatSlug(state))

  return {
    title: `Golf Courses in ${stateName} | Wander`,
    description: `Discover the best golf courses in ${stateName}. Browse by city, find course details, ratings, and book tee times.`,
  }
}

async function getCitiesInState(stateSlug: string) {
  const stateFormatted = formatSlug(stateSlug)
  const stateName = getStateName(stateFormatted)
  const stateAbbrev = getStateAbbrev(stateFormatted)

  // Try matching by full name, formatted slug, or abbreviation
  const cities = await prisma.$queryRaw<{ city: string; count: bigint }[]>`
    SELECT city, COUNT(*) as count
    FROM "Club"
    WHERE LOWER(state) = LOWER(${stateName})
       OR LOWER(state) = LOWER(${stateFormatted})
       OR UPPER(state) = ${stateAbbrev}
    GROUP BY city
    ORDER BY count DESC, city ASC
  `

  return cities.map(c => ({
    city: c.city,
    count: Number(c.count),
  }))
}

export default async function StatePage({ params }: StatePageProps) {
  const { state } = await params
  const stateFormatted = formatSlug(state)

  // Validate it's a US state
  if (!isValidUSState(stateFormatted)) {
    notFound()
  }

  const stateName = getStateName(stateFormatted)
  const cities = await getCitiesInState(state)

  if (cities.length === 0) {
    notFound()
  }

  const totalCourses = cities.reduce((sum, c) => sum + c.count, 0)

  return (
    <main className="min-h-screen bg-[#f8f5ef]">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <nav className="text-sm mb-4">
            <Link href="/" className="hover:underline">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/courses" className="hover:underline">Courses</Link>
            <span className="mx-2">/</span>
            <span>{stateName}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-serif)] font-normal">
            Golf Courses in {stateName}
          </h1>
          <p className="text-xl mt-4 text-white/80">
            {totalCourses.toLocaleString()} {totalCourses === 1 ? 'course' : 'courses'} across {cities.length} {cities.length === 1 ? 'city' : 'cities'}
          </p>
        </div>
      </header>

      {/* Cities Grid */}
      <section className="max-w-6xl mx-auto py-12 px-4">
        <h2 className="text-2xl font-[family-name:var(--font-serif)] font-normal text-[#1a3a2a] mb-6">
          Cities in {stateName}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cities.map((c) => (
            <CityCard
              key={c.city}
              city={c.city}
              state={state}
              count={c.count}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

function CityCard({ city, state, count }: { city: string; state: string; count: number }) {
  const citySlug = city.toLowerCase().replace(/\s+/g, '-')

  return (
    <Link
      href={`/courses/${state}/${citySlug}`}
      className="block p-6 bg-white border border-[#1a3a2a]/10 rounded-lg hover:border-[#c9a84c] hover:shadow-lg transition-all"
    >
      <h3 className="text-lg font-semibold text-[#1a3a2a]">{city}</h3>
      <p className="text-sm text-[#1a3a2a]/60 mt-1">
        {count} {count === 1 ? 'course' : 'courses'}
      </p>
    </Link>
  )
}
