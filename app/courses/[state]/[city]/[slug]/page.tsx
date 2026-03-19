import Link from 'next/link'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getStateName } from '@/lib/states'

interface CoursePageProps {
  params: Promise<{ state: string; city: string; slug: string }>
}

function formatName(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export async function generateMetadata({ params }: CoursePageProps) {
  const { slug } = await params
  const club = await prisma.club.findUnique({
    where: { slug },
    select: { name: true, metaDescription: true },
  })

  if (!club) {
    return { title: 'Course Not Found | Wander' }
  }

  return {
    title: `${club.name} | Wander`,
    description: club.metaDescription || `${club.name} - View course details, tee sheet, ratings, and book tee times.`,
  }
}

async function getClubBySlug(slug: string) {
  const club = await prisma.club.findUnique({
    where: { slug },
    include: {
      courses: {
        include: {
          tees: {
            orderBy: [{ gender: 'asc' }, { totalYards: 'desc' }],
            include: {
              holes: {
                orderBy: { holeNumber: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  return club
}

async function getNearbyCourses(city: string, state: string, excludeId: string) {
  const nearby = await prisma.club.findMany({
    where: {
      city: { equals: city, mode: 'insensitive' },
      state: { equals: state, mode: 'insensitive' },
      id: { not: excludeId },
    },
    take: 3,
    select: {
      name: true,
      slug: true,
      city: true,
    },
  })

  return nearby
}

export default async function CourseProfilePage({ params }: CoursePageProps) {
  const { state, city, slug } = await params
  const club = await getClubBySlug(slug)

  if (!club) {
    notFound()
  }

  const cityName = formatName(city)
  const stateName = getStateName(formatName(state))
  const nearbyCourses = await getNearbyCourses(club.city, club.state, club.id)

  // Get primary course and tee data
  const primaryCourse = club.courses[0]
  const maleTees = primaryCourse?.tees.filter(t => t.gender === 'Male') || []
  const femaleTees = primaryCourse?.tees.filter(t => t.gender === 'Female') || []
  const primaryTee = maleTees[0]

  // Calculate stats from primary tee
  const par = primaryCourse?.parTotal || primaryTee?.parTotal || 72
  const yardage = primaryTee?.totalYards || 0
  const slope = primaryTee?.slopeRating || 0
  const rating = primaryTee?.courseRating || 0

  return (
    <main className="min-h-screen bg-[#f8f5ef]">
      {/* 1. Hero */}
      <header className="relative text-white" style={{ height: '400px' }}>
        {/* Background Image */}
        <img
          src={club.photoUrl || '/images/hero-morning.png'}
          alt={`${club.name} golf course`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        {/* Dark Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(26, 58, 42, 0.55)',
          }}
        />
        {/* Content */}
        <div
          style={{
            position: 'relative',
            height: '100%',
            maxWidth: '72rem',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            paddingBottom: '40px',
          }}
        >
          <nav style={{ paddingTop: '20px', marginBottom: '16px' }} className="text-sm">
            <Link href="/" className="hover:underline">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/courses" className="hover:underline">Courses</Link>
            <span className="mx-2">/</span>
            <Link href={`/courses/${state}`} className="hover:underline">{stateName}</Link>
            <span className="mx-2">/</span>
            <Link href={`/courses/${state}/${city}`} className="hover:underline">{cityName}</Link>
          </nav>

          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-serif)] font-normal">
                {club.name}
              </h1>
              <p className="text-xl mt-2 text-white/80">
                {club.city}, {club.state}
              </p>
            </div>
            {club.localsPickScore && club.localsPickScore > 4 && (
              <div className="bg-[#c9a84c] text-[#1a3a2a] px-4 py-2 rounded-full font-semibold text-sm">
                Locals Pick
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* 2. At a Glance */}
            <section className="bg-white p-6 rounded-lg border border-[#1a3a2a]/10">
              <h2 className="text-xl font-[family-name:var(--font-serif)] font-normal text-[#1a3a2a] mb-4">
                At a Glance
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                <Stat label="Par" value={par.toString()} />
                <Stat label="Yardage" value={yardage ? yardage.toLocaleString() : '—'} />
                <Stat label="Slope" value={slope ? slope.toString() : '—'} />
                <Stat label="Rating" value={rating ? rating.toFixed(1) : '—'} />
                <Stat label="Walkable" value={club.walkable === true ? 'Yes' : club.walkable === false ? 'No' : '—'} />
                <Stat label="Access" value={club.accessType || '—'} />
              </div>
            </section>

            {/* 3. Editorial Write-up */}
            <section className="bg-white p-6 rounded-lg border border-[#1a3a2a]/10">
              <h2 className="text-xl font-[family-name:var(--font-serif)] font-normal text-[#1a3a2a] mb-4">
                About This Course
              </h2>
              <div className="prose text-[#1a3a2a]/80">
                {club.writtenSummary ? (
                  <p>{club.writtenSummary}</p>
                ) : club.description ? (
                  <p>{club.description}</p>
                ) : (
                  <p className="text-[#1a3a2a]/50 italic">
                    Editorial write-up coming soon.
                  </p>
                )}
              </div>
            </section>

            {/* 4. Tee Sheet */}
            <section className="bg-white p-6 rounded-lg border border-[#1a3a2a]/10">
              <h2 className="text-xl font-[family-name:var(--font-serif)] font-normal text-[#1a3a2a] mb-4">
                Tee Sheet
              </h2>
              {maleTees.length > 0 || femaleTees.length > 0 ? (
                <div className="space-y-6">
                  {maleTees.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-[#1a3a2a]/60 mb-2">Men&apos;s Tees</h3>
                      <TeeTable tees={maleTees} />
                    </div>
                  )}
                  {femaleTees.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-[#1a3a2a]/60 mb-2">Women&apos;s Tees</h3>
                      <TeeTable tees={femaleTees} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[#1a3a2a]/50 italic">Tee information not available.</p>
              )}
            </section>

            {/* 5. Greens Report */}
            <section className="bg-white p-6 rounded-lg border border-[#1a3a2a]/10">
              <h2 className="text-xl font-[family-name:var(--font-serif)] font-normal text-[#1a3a2a] mb-4">
                Greens Report
              </h2>
              <p className="text-[#1a3a2a]/60">
                No recent reports. Have you played here recently?
              </p>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* 6. Actions */}
            <section className="bg-white p-6 rounded-lg border border-[#1a3a2a]/10">
              <div className="space-y-3">
                <button className="w-full py-3 bg-[#1a3a2a] text-white rounded-lg font-semibold hover:bg-[#1a3a2a]/90 transition-colors">
                  Book Tee Time
                </button>
                <button className="w-full py-3 bg-[#c9a84c] text-[#1a3a2a] rounded-lg font-semibold hover:bg-[#c9a84c]/90 transition-colors">
                  Played It
                </button>
                <button className="w-full py-3 border border-[#1a3a2a]/20 text-[#1a3a2a] rounded-lg font-semibold hover:bg-[#1a3a2a]/5 transition-colors">
                  Save to List
                </button>
              </div>
            </section>

            {/* Contact Info */}
            <section className="bg-white p-6 rounded-lg border border-[#1a3a2a]/10">
              <h3 className="font-semibold text-[#1a3a2a] mb-3">Contact</h3>
              <div className="space-y-2 text-sm text-[#1a3a2a]/70">
                {club.address && <p>{club.address}</p>}
                <p>{club.city}, {club.state}</p>
                {club.phone && <p>{club.phone}</p>}
                {club.website && (
                  <a
                    href={club.website.startsWith('http') ? club.website : `https://${club.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1a3a2a] hover:underline block"
                  >
                    Website
                  </a>
                )}
              </div>
            </section>

            {/* 7. Nearby Courses */}
            {nearbyCourses.length > 0 && (
              <section className="bg-white p-6 rounded-lg border border-[#1a3a2a]/10">
                <h3 className="font-semibold text-[#1a3a2a] mb-3">Nearby Courses</h3>
                <div className="space-y-3">
                  {nearbyCourses.map((nearby) => (
                    <Link
                      key={nearby.slug}
                      href={`/courses/${state}/${city}/${nearby.slug}`}
                      className="flex justify-between items-center py-2 border-b border-[#1a3a2a]/5 last:border-0 hover:text-[#c9a84c] transition-colors"
                    >
                      <span className="text-sm text-[#1a3a2a]">{nearby.name}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold text-[#1a3a2a]">{value}</div>
      <div className="text-xs text-[#1a3a2a]/60">{label}</div>
    </div>
  )
}

interface TeeData {
  id: string
  teeName: string
  totalYards: number | null
  parTotal: number | null
  courseRating: number | null
  slopeRating: number | null
}

function TeeTable({ tees }: { tees: TeeData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1a3a2a]/10">
            <th className="text-left py-2 text-[#1a3a2a]/60">Tee</th>
            <th className="text-right py-2 text-[#1a3a2a]/60">Yards</th>
            <th className="text-right py-2 text-[#1a3a2a]/60">Par</th>
            <th className="text-right py-2 text-[#1a3a2a]/60">Rating</th>
            <th className="text-right py-2 text-[#1a3a2a]/60">Slope</th>
          </tr>
        </thead>
        <tbody>
          {tees.map((tee) => (
            <tr key={tee.id} className="border-b border-[#1a3a2a]/5">
              <td className="py-2 font-medium text-[#1a3a2a]">{tee.teeName}</td>
              <td className="py-2 text-right text-[#1a3a2a]/70">
                {tee.totalYards?.toLocaleString() || '—'}
              </td>
              <td className="py-2 text-right text-[#1a3a2a]/70">
                {tee.parTotal || '—'}
              </td>
              <td className="py-2 text-right text-[#1a3a2a]/70">
                {tee.courseRating?.toFixed(1) || '—'}
              </td>
              <td className="py-2 text-right text-[#1a3a2a]/70">
                {tee.slopeRating || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
