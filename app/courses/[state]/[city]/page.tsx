import Link from 'next/link'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getStateName, getStateAbbrev } from '@/lib/states'

interface CityPageProps {
  params: Promise<{ state: string; city: string }>
}

function formatName(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export async function generateMetadata({ params }: CityPageProps) {
  const { state, city } = await params
  const cityName = formatName(city)
  const stateName = getStateName(formatName(state))

  return {
    title: `Golf Courses in ${cityName}, ${stateName} | Wander`,
    description: `Find the best golf courses in ${cityName}, ${stateName}. View course details, tee times, ratings, and reviews.`,
  }
}

async function getCoursesInCity(stateSlug: string, citySlug: string) {
  const stateName = getStateName(formatName(stateSlug))
  const stateAbbrev = getStateAbbrev(formatName(stateSlug))
  const cityName = formatName(citySlug)

  const clubs = await prisma.club.findMany({
    where: {
      OR: [
        { state: { equals: stateName, mode: 'insensitive' } },
        { state: { equals: formatName(stateSlug), mode: 'insensitive' } },
        { state: { equals: stateAbbrev, mode: 'insensitive' } },
      ],
      city: { equals: cityName, mode: 'insensitive' },
    },
    include: {
      courses: {
        include: {
          tees: {
            where: { gender: 'Male' },
            orderBy: { totalYards: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return clubs
}

export default async function CityPage({ params }: CityPageProps) {
  const { state, city } = await params
  const cityName = formatName(city)
  const stateName = getStateName(formatName(state))
  const clubs = await getCoursesInCity(state, city)

  if (clubs.length === 0) {
    notFound()
  }

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
            <Link href={`/courses/${state}`} className="hover:underline">{stateName}</Link>
            <span className="mx-2">/</span>
            <span>{cityName}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-serif)] font-normal">
            Golf Courses in {cityName}
          </h1>
          <p className="text-xl mt-4 text-white/80">
            {stateName}
          </p>
        </div>
      </header>

      {/* Courses List */}
      <section className="max-w-6xl mx-auto py-12 px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-[family-name:var(--font-serif)] font-normal text-[#1a3a2a]">
            {clubs.length} {clubs.length === 1 ? 'Course' : 'Courses'}
          </h2>
        </div>

        <div className="space-y-4">
          {clubs.map((club) => {
            const firstCourse = club.courses[0]
            const firstTee = firstCourse?.tees[0]

            return (
              <CourseCard
                key={club.id}
                name={club.name}
                slug={club.slug}
                city={city}
                state={state}
                accessType={club.accessType}
                slope={firstTee?.slopeRating || null}
                par={firstCourse?.parTotal || firstTee?.parTotal || null}
                yardage={firstTee?.totalYards || null}
              />
            )
          })}
        </div>
      </section>
    </main>
  )
}

function CourseCard({
  name,
  slug,
  city,
  state,
  accessType,
  slope,
  par,
  yardage,
}: {
  name: string
  slug: string
  city: string
  state: string
  accessType: string | null
  slope: number | null
  par: number | null
  yardage: number | null
}) {
  return (
    <Link
      href={`/courses/${state}/${city}/${slug}`}
      className="block p-6 bg-white border border-[#1a3a2a]/10 rounded-lg hover:border-[#c9a84c] hover:shadow-lg transition-all"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-[#1a3a2a]">{name}</h3>
          {accessType && (
            <p className="text-sm text-[#1a3a2a]/60 mt-1">{accessType}</p>
          )}
        </div>
        <div className="text-right flex gap-6">
          {par && (
            <div>
              <div className="text-[#1a3a2a] font-semibold">{par}</div>
              <div className="text-xs text-[#1a3a2a]/60">par</div>
            </div>
          )}
          {yardage && (
            <div>
              <div className="text-[#1a3a2a] font-semibold">{yardage.toLocaleString()}</div>
              <div className="text-xs text-[#1a3a2a]/60">yards</div>
            </div>
          )}
          {slope && (
            <div>
              <div className="text-[#c9a84c] font-semibold">{slope}</div>
              <div className="text-xs text-[#1a3a2a]/60">slope</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
