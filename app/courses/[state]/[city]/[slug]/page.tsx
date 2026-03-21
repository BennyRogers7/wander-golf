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
  const holes = primaryCourse?.numberOfHoles || 18
  const par = primaryCourse?.parTotal || primaryTee?.parTotal || 72
  const yardage = primaryTee?.totalYards || 0
  const slope = primaryTee?.slopeRating || 0
  const rating = primaryTee?.courseRating || 0

  // Check for locals pick (score > 4)
  const isLocalsPick = club.localsPickScore && club.localsPickScore > 4

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GolfCourse',
    name: club.name,
    description: club.metaDescription || club.writtenSummary || `${club.name} golf course in ${club.city}, ${club.state}`,
    url: `https://wander.golf/courses/${state}/${city}/${slug}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: club.address || undefined,
      addressLocality: club.city,
      addressRegion: club.state,
      addressCountry: 'US',
    },
    geo: club.latitude && club.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: club.latitude,
      longitude: club.longitude,
    } : undefined,
    telephone: club.phone || undefined,
    image: club.photoUrl || 'https://wander.golf/images/hero-morning.png',
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <header className="relative h-[400px]">
        <img
          src={club.photoUrl || '/images/hero-morning.png'}
          alt={`${club.name} golf course`}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0" style={{ background: 'rgba(26, 58, 42, 0.55)' }} />

        {/* Wander Approved medallion */}
        {club.wanderApproved && (
          <div className="absolute top-6 right-6 bg-[#c9a84c] text-[#1a3a2a] px-4 py-2 text-xs font-semibold uppercase tracking-wide">
            Wander Approved
          </div>
        )}

        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-between">
          {/* Breadcrumb at top */}
          <nav className="pt-6 text-sm text-white/60">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/courses" className="hover:text-white/80">Courses</Link>
            <span className="mx-2">/</span>
            <Link href={`/courses/${state}`} className="hover:text-white/80">{stateName}</Link>
            <span className="mx-2">/</span>
            <Link href={`/courses/${state}/${city}`} className="hover:text-white/80">{cityName}</Link>
          </nav>

          {/* Bottom-aligned content */}
          <div className="pb-10">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-[family-name:var(--font-serif)] text-[32px] md:text-5xl font-normal text-white">
                {club.name}
              </h1>
              {isLocalsPick && (
                <span className="bg-[#c9a84c] text-[#1a3a2a] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  Locals Pick
                </span>
              )}
            </div>
            <p className="text-base text-white/70 mt-2">
              {club.city}, {club.state}
            </p>
          </div>
        </div>
      </header>

      {/* TODO: Photo gallery renders when club.photos array has > 1 item */}
      {/* Photos uploaded via claimed listing flow */}

      {/* QUICK STATS BAR */}
      <div className="bg-[#1a3a2a] py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-3 md:flex md:justify-center md:items-center gap-y-4 md:gap-0">
            <QuickStat label="Holes" value={holes.toString()} />
            <StatDivider className="hidden md:block" />
            <QuickStat label="Par" value={par.toString()} />
            <StatDivider className="hidden md:block" />
            <QuickStat label="Yardage" value={yardage ? yardage.toLocaleString() : '—'} />
            <StatDivider className="hidden md:block" />
            <QuickStat label="Slope" value={slope ? slope.toString() : '—'} />
            <StatDivider className="hidden md:block" />
            <QuickStat label="Rating" value={rating ? rating.toFixed(1) : '—'} />
            <StatDivider className="hidden md:block" />
            <QuickStat label="Access" value={club.accessType || '—'} />
          </div>
        </div>
      </div>

      {/* MOBILE ACTION BUTTONS - Fixed at bottom on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#f8f5ef] border-t border-[#1a3a2a]/10 p-4 z-50">
        <div className="flex gap-3">
          <button className="flex-1 py-3 bg-[#1a3a2a] text-white text-sm font-medium">
            Book Tee Time
          </button>
          <button className="flex-1 py-3 bg-[#c9a84c] text-[#1a3a2a] text-sm font-medium">
            Played It ✓
          </button>
        </div>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="max-w-[1200px] mx-auto py-8 md:py-12 px-4 pb-28 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8">
          {/* LEFT COLUMN - Main content */}
          <div className="space-y-8 order-1">
            {/* Editorial Section */}
            <section>
              <h2 className="font-[family-name:var(--font-serif)] text-2xl font-normal text-[#1a3a2a] mb-6">
                About This Course
              </h2>
              <div className="text-[#1a3a2a]/80 leading-relaxed">
                {club.writtenSummary ? (
                  <p>{club.writtenSummary}</p>
                ) : club.description ? (
                  <p>{club.description}</p>
                ) : (
                  <p className="italic text-[#1a3a2a]/50">
                    Editorial write-up coming soon.
                  </p>
                )}
              </div>
            </section>

            {/* Community Section */}
            <section>
              <h2 className="font-[family-name:var(--font-serif)] text-2xl font-normal text-[#1a3a2a] mb-6">
                What Golfers Say
              </h2>
              <p className="text-[#1a3a2a]/70 mb-4">
                {club.totalPlayedIt > 0
                  ? `${club.totalPlayedIt} golfer${club.totalPlayedIt === 1 ? ' has' : 's have'} played this course`
                  : 'Be the first to review this course'}
              </p>
              <div className="flex gap-3">
                <CommunityPill label="Pace of Play" value="—" />
                <CommunityPill label="Worth the Price" value="—" />
                <CommunityPill label="Would Return" value="—" />
              </div>
            </section>

            {/* Greens Report Section */}
            <section>
              <h2 className="font-[family-name:var(--font-serif)] text-2xl font-normal text-[#1a3a2a] mb-6">
                Greens Report
              </h2>
              {/* TODO: Query GreensReport model when implemented */}
              <p className="text-[#1a3a2a]/60 mb-4">
                No recent reports — be the first
              </p>
              <button className="px-4 py-2 text-sm border border-[#1a3a2a] text-[#1a3a2a] hover:bg-[#1a3a2a]/5 transition-colors">
                Report Current Conditions
              </button>
            </section>

            {/* Tee Sheet Section */}
            <section>
              <h2 className="font-[family-name:var(--font-serif)] text-2xl font-normal text-[#1a3a2a] mb-6">
                Tee Sheet
              </h2>
              {maleTees.length > 0 || femaleTees.length > 0 ? (
                <div className="space-y-6">
                  {maleTees.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-[#1a3a2a]/60 mb-3">Men&apos;s Tees</h3>
                      <TeeTable tees={maleTees} />
                    </div>
                  )}
                  {femaleTees.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-[#1a3a2a]/60 mb-3">Women&apos;s Tees</h3>
                      <TeeTable tees={femaleTees} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[#1a3a2a]/50 italic">Tee information not available.</p>
              )}
            </section>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6 order-2">
            {/* Actions - Hidden on mobile since we have fixed bottom bar */}
            <div className="hidden md:block space-y-0">
              <button className="w-full py-3 bg-[#1a3a2a] text-white text-sm font-medium hover:bg-[#1a3a2a]/90 transition-colors">
                Book Tee Time
              </button>
              <button className="w-full py-3 bg-[#c9a84c] text-[#1a3a2a] text-sm font-medium hover:bg-[#c9a84c]/90 transition-colors">
                Played It ✓
              </button>
              <button className="w-full py-3 border border-[#1a3a2a]/30 text-[#1a3a2a] text-sm hover:bg-[#1a3a2a]/5 transition-colors">
                Save to List
              </button>
              <Link
                href="#"
                className="block text-sm text-[#c9a84c] text-center mt-2 cursor-pointer hover:underline"
              >
                Find courses like this →
              </Link>
            </div>

            {/* At a Glance Card */}
            <div className="bg-white border border-[#1a3a2a]/10 p-6">
              <h3 className="font-[family-name:var(--font-serif)] text-lg font-normal text-[#1a3a2a] mb-4">
                At a Glance
              </h3>
              <div className="space-y-0">
                <GlanceRow label="Designer" value="—" />
                <GlanceRow label="Year Est." value="—" />
                <GlanceRow label="Course Style" value="—" />
                <GlanceRow label="Walkable" value={club.walkable === true ? 'Yes' : club.walkable === false ? 'No' : '—'} />
                <GlanceRow label="Price Range" value={club.priceRange || '—'} />
                <GlanceRow label="Access Type" value={club.accessType || '—'} isLast />
              </div>
            </div>

            {/* Contact Card */}
            <div className="bg-white border border-[#1a3a2a]/10 p-6">
              <h3 className="font-[family-name:var(--font-serif)] text-lg font-normal text-[#1a3a2a] mb-4">
                Contact
              </h3>
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
                    Website →
                  </a>
                )}
              </div>
              {!club.claimed && (
                <Link
                  href="#"
                  className="text-xs text-[#c9a84c] mt-4 block hover:underline"
                >
                  Is this your course? Claim this listing →
                </Link>
              )}
            </div>

            {/* Nearby Courses Card */}
            {nearbyCourses.length > 0 && (
              <div className="bg-white border border-[#1a3a2a]/10 p-6">
                <h3 className="font-[family-name:var(--font-serif)] text-lg font-normal text-[#1a3a2a] mb-4">
                  Nearby Courses
                </h3>
                <div className="space-y-0">
                  {nearbyCourses.map((nearby, index) => (
                    <Link
                      key={nearby.slug}
                      href={`/courses/${state}/${city}/${nearby.slug}`}
                      className={`flex justify-between items-center py-3 ${
                        index < nearbyCourses.length - 1 ? 'border-b border-[#1a3a2a]/10' : ''
                      } hover:text-[#c9a84c] transition-colors group`}
                    >
                      <div>
                        <span className="text-sm text-[#1a3a2a] group-hover:text-[#c9a84c]">{nearby.name}</span>
                        <span className="text-xs text-[#1a3a2a]/50 block">{nearby.city}</span>
                      </div>
                      <span className="text-[#c9a84c]">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center px-6">
      <div className="text-white text-lg font-semibold">{value}</div>
      <div className="text-white/50 text-xs mt-1">{label}</div>
    </div>
  )
}

function StatDivider({ className = '' }: { className?: string }) {
  return <div className={`h-10 w-px bg-white/20 ${className}`} />
}

function CommunityPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f8f5ef] px-4 py-2 text-center">
      <div className="text-sm text-[#1a3a2a]/60 font-medium">{value}</div>
      <div className="text-xs text-[#1a3a2a]/40 mt-1">{label}</div>
    </div>
  )
}

function GlanceRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  if (value === '—') return null
  return (
    <div className={`flex justify-between items-center py-3 ${!isLast ? 'border-b border-[#1a3a2a]/10' : ''}`}>
      <span className="text-sm text-[#1a3a2a]/60">{label}</span>
      <span className="text-sm text-[#1a3a2a] font-medium">{value}</span>
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
            <th className="text-left py-2 text-[#1a3a2a]/60 font-medium">Tee</th>
            <th className="text-right py-2 text-[#1a3a2a]/60 font-medium">Yards</th>
            <th className="text-right py-2 text-[#1a3a2a]/60 font-medium">Par</th>
            <th className="text-right py-2 text-[#1a3a2a]/60 font-medium">Rating</th>
            <th className="text-right py-2 text-[#1a3a2a]/60 font-medium">Slope</th>
          </tr>
        </thead>
        <tbody>
          {tees.map((tee) => (
            <tr key={tee.id} className="border-b border-[#1a3a2a]/10">
              <td className="py-3 font-medium text-[#1a3a2a]">{tee.teeName}</td>
              <td className="py-3 text-right text-[#1a3a2a]/70">
                {tee.totalYards?.toLocaleString() || '—'}
              </td>
              <td className="py-3 text-right text-[#1a3a2a]/70">
                {tee.parTotal || '—'}
              </td>
              <td className="py-3 text-right text-[#1a3a2a]/70">
                {tee.courseRating?.toFixed(1) || '—'}
              </td>
              <td className="py-3 text-right text-[#1a3a2a]/70">
                {tee.slopeRating || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
