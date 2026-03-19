import { PrismaClient } from '@prisma/client'
import slugify from 'slugify'
import 'dotenv/config'

let prisma = new PrismaClient()

const BASE_URL = 'https://api.golfcourseapi.com/v1'
const API_KEY = process.env.GOLF_API_KEY
const TEST_MODE = process.argv.includes('--test')
const RECONNECT_INTERVAL = 500

// Parse command line arguments
function getArgValue(argName: string): number | null {
  const arg = process.argv.find(a => a.startsWith(`--${argName}=`))
  if (arg) {
    const value = parseInt(arg.split('=')[1], 10)
    return isNaN(value) ? null : value
  }
  return null
}

const START_PAGE = getArgValue('start-page') ?? 1
const END_PAGE = getArgValue('end-page') ?? Infinity

if (!API_KEY) {
  console.error('Error: GOLF_API_KEY environment variable is required')
  process.exit(1)
}

interface ApiHole {
  par: number
  yardage: number
  handicap?: number
}

interface ApiTee {
  tee_name: string
  course_rating: number | null
  slope_rating: number | null
  bogey_rating: number | null
  total_yards: number | null
  total_meters: number | null
  par_total: number | null
  front_course_rating: number | null
  front_slope_rating: number | null
  back_course_rating: number | null
  back_slope_rating: number | null
  holes: ApiHole[]
}

interface ApiTeeSet {
  male: ApiTee[]
  female: ApiTee[]
}

interface ApiCourse {
  id: number
  club_name: string
  course_name: string
  location: {
    address: string | null
    city: string
    state: string
    country: string
    latitude: number | null
    longitude: number | null
  }
  phone_number: string | null
  website: string | null
  num_holes: number | null
  par_total: number | null
  tees: ApiTeeSet
}

interface ApiSearchResponse {
  courses: ApiCourse[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

interface SessionStats {
  startTime: number
  clubsThisSession: number
  totalPages: number | null
  perPage: number
}

function createSlug(name: string, city: string): string {
  return slugify(`${name} ${city}`, { lower: true, strict: true })
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

function logProgress(
  page: number,
  stats: SessionStats,
  totalInDb: number
): void {
  const elapsed = Date.now() - stats.startTime
  const clubsPerMs = stats.clubsThisSession / elapsed

  let progressLine = `📊 Page ${page}`

  if (stats.totalPages) {
    const effectiveEndPage = Math.min(END_PAGE, stats.totalPages)
    progressLine += `/${effectiveEndPage}`

    // Calculate remaining
    const pagesRemaining = effectiveEndPage - page
    const clubsRemaining = pagesRemaining * stats.perPage
    const msRemaining = clubsRemaining / clubsPerMs

    if (clubsPerMs > 0 && pagesRemaining > 0) {
      progressLine += ` | ETA: ${formatTime(msRemaining)}`
    }
  }

  progressLine += ` | Session: ${stats.clubsThisSession.toLocaleString()} clubs`
  progressLine += ` | Total in DB: ${totalInDb.toLocaleString()}`

  console.log(progressLine)
}

async function reconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
  prisma = new PrismaClient()
  console.log('🔄 Reconnected to database')
}

async function getDbCounts(): Promise<{ clubs: number; courses: number; tees: number; holes: number }> {
  const [clubs, courses, tees, holes] = await Promise.all([
    prisma.club.count(),
    prisma.course.count(),
    prisma.tee.count(),
    prisma.hole.count(),
  ])
  return { clubs, courses, tees, holes }
}

async function fetchPage(page: number, retries = 3): Promise<ApiSearchResponse> {
  const url = `${BASE_URL}/search?search_query=golf&page=${page}`

  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()

      if (TEST_MODE && page === START_PAGE) {
        console.log('📡 Raw API response structure:')
        console.log('Keys:', Object.keys(data))
        console.log('Sample:', JSON.stringify(data, null, 2).slice(0, 1000))
      }

      return data
    }

    if (response.status === 429) {
      const waitTime = Math.pow(2, attempt) * 5000 // 10s, 20s, 40s
      console.log(`⏳ Rate limited. Waiting ${waitTime / 1000}s before retry ${attempt}/${retries}...`)
      await sleep(waitTime)
      continue
    }

    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  throw new Error(`API error: 429 Too Many Requests after ${retries} retries`)
}

async function upsertClub(apiCourse: ApiCourse): Promise<string> {
  const slug = createSlug(apiCourse.club_name, apiCourse.location.city)

  const club = await prisma.club.upsert({
    where: { apiId: apiCourse.id },
    update: {
      name: apiCourse.club_name,
      slug,
      address: apiCourse.location.address,
      city: apiCourse.location.city,
      state: apiCourse.location.state,
      country: apiCourse.location.country || 'United States',
      latitude: apiCourse.location.latitude,
      longitude: apiCourse.location.longitude,
      phone: apiCourse.phone_number,
      website: apiCourse.website,
    },
    create: {
      apiId: apiCourse.id,
      name: apiCourse.club_name,
      slug,
      address: apiCourse.location.address,
      city: apiCourse.location.city,
      state: apiCourse.location.state,
      country: apiCourse.location.country || 'United States',
      latitude: apiCourse.location.latitude,
      longitude: apiCourse.location.longitude,
      phone: apiCourse.phone_number,
      website: apiCourse.website,
    },
  })

  return club.id
}

async function upsertCourse(
  clubId: string,
  apiCourse: ApiCourse
): Promise<string> {
  const existingCourse = await prisma.course.findFirst({
    where: {
      clubId,
      name: apiCourse.course_name,
    },
  })

  if (existingCourse) {
    await prisma.course.update({
      where: { id: existingCourse.id },
      data: {
        numberOfHoles: apiCourse.num_holes || 18,
        parTotal: apiCourse.par_total,
      },
    })
    return existingCourse.id
  }

  const course = await prisma.course.create({
    data: {
      clubId,
      name: apiCourse.course_name,
      numberOfHoles: apiCourse.num_holes || 18,
      parTotal: apiCourse.par_total,
    },
  })

  return course.id
}

async function upsertTee(
  courseId: string,
  apiTee: ApiTee,
  gender: string
): Promise<string> {
  const existingTee = await prisma.tee.findFirst({
    where: {
      courseId,
      teeName: apiTee.tee_name,
      gender,
    },
  })

  if (existingTee) {
    await prisma.tee.update({
      where: { id: existingTee.id },
      data: {
        courseRating: apiTee.course_rating,
        slopeRating: apiTee.slope_rating,
        bogeyRating: apiTee.bogey_rating,
        totalYards: apiTee.total_yards,
        totalMeters: apiTee.total_meters,
        parTotal: apiTee.par_total,
        frontCourseRating: apiTee.front_course_rating,
        frontSlopeRating: apiTee.front_slope_rating,
        backCourseRating: apiTee.back_course_rating,
        backSlopeRating: apiTee.back_slope_rating,
      },
    })
    return existingTee.id
  }

  const tee = await prisma.tee.create({
    data: {
      courseId,
      gender,
      teeName: apiTee.tee_name,
      courseRating: apiTee.course_rating,
      slopeRating: apiTee.slope_rating,
      bogeyRating: apiTee.bogey_rating,
      totalYards: apiTee.total_yards,
      totalMeters: apiTee.total_meters,
      parTotal: apiTee.par_total,
      frontCourseRating: apiTee.front_course_rating,
      frontSlopeRating: apiTee.front_slope_rating,
      backCourseRating: apiTee.back_course_rating,
      backSlopeRating: apiTee.back_slope_rating,
    },
  })

  return tee.id
}

async function upsertHolesBatch(teeId: string, apiHoles: ApiHole[]): Promise<void> {
  // Delete existing holes for this tee and recreate them in batch
  await prisma.hole.deleteMany({
    where: { teeId },
  })

  const holesData = apiHoles.map((hole, index) => ({
    teeId,
    holeNumber: index + 1,
    par: hole.par,
    yardage: hole.yardage,
    handicap: hole.handicap ?? null,
  }))

  await prisma.hole.createMany({
    data: holesData,
  })
}

async function processTees(courseId: string, tees: ApiTeeSet): Promise<void> {
  // Process male tees
  if (tees.male) {
    for (const apiTee of tees.male) {
      const teeId = await upsertTee(courseId, apiTee, 'male')
      if (apiTee.holes && apiTee.holes.length > 0) {
        await upsertHolesBatch(teeId, apiTee.holes)
      }
    }
  }

  // Process female tees
  if (tees.female) {
    for (const apiTee of tees.female) {
      const teeId = await upsertTee(courseId, apiTee, 'female')
      if (apiTee.holes && apiTee.holes.length > 0) {
        await upsertHolesBatch(teeId, apiTee.holes)
      }
    }
  }
}

async function processApiCourse(apiCourse: ApiCourse): Promise<void> {
  const clubId = await upsertClub(apiCourse)
  const courseId = await upsertCourse(clubId, apiCourse)

  if (apiCourse.tees) {
    await processTees(courseId, apiCourse.tees)
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('🏌️ Wander - Course Ingestion')
  console.log('='.repeat(60))

  if (TEST_MODE) {
    console.log('🧪 TEST MODE: Processing first 3 courses from page 1 only\n')
  }

  // Show configuration
  console.log(`API Key: ${API_KEY?.substring(0, 8)}...`)
  console.log(`Start Page: ${START_PAGE}`)
  console.log(`End Page: ${END_PAGE === Infinity ? 'unlimited' : END_PAGE}`)

  // Get initial DB counts
  const initialCounts = await getDbCounts()
  console.log(`\n📦 Initial DB state:`)
  console.log(`   Clubs: ${initialCounts.clubs.toLocaleString()}`)
  console.log(`   Courses: ${initialCounts.courses.toLocaleString()}`)
  console.log(`   Tees: ${initialCounts.tees.toLocaleString()}`)
  console.log(`   Holes: ${initialCounts.holes.toLocaleString()}`)
  console.log('')

  const stats: SessionStats = {
    startTime: Date.now(),
    clubsThisSession: 0,
    totalPages: null,
    perPage: 25,
  }

  let page = START_PAGE
  let hasMorePages = true

  try {
    while (hasMorePages && page <= END_PAGE) {
      const response = await fetchPage(page)
      const courses = response.courses

      // Update stats from first response
      if (stats.totalPages === null) {
        stats.totalPages = response.total_pages || null
        stats.perPage = response.per_page || 25
        console.log(`📡 API reports ${response.total?.toLocaleString() || 'unknown'} total courses across ${stats.totalPages || 'unknown'} pages\n`)
      }

      if (!courses || courses.length === 0) {
        console.log('✅ No more courses to process')
        break
      }

      // In test mode, only process first 3 courses
      const coursesToProcess = TEST_MODE ? courses.slice(0, 3) : courses

      for (let i = 0; i < coursesToProcess.length; i++) {
        const apiCourse = coursesToProcess[i]

        // In test mode, log raw API response for first course
        if (TEST_MODE && i === 0 && page === START_PAGE) {
          console.log('\n📦 Raw API response for first course:')
          console.log(JSON.stringify(apiCourse, null, 2))
          console.log('\n')
        }

        await processApiCourse(apiCourse)
        stats.clubsThisSession++

        // Reconnect every RECONNECT_INTERVAL records to prevent connection pool buildup
        if (stats.clubsThisSession % RECONNECT_INTERVAL === 0) {
          await reconnectPrisma()
        }

        // Rate limiting: 100ms delay between records
        await sleep(100)
      }

      // Log progress after each page
      const currentCounts = await getDbCounts()
      logProgress(page, stats, currentCounts.clubs)

      // In test mode, stop after first page
      if (TEST_MODE) {
        console.log('\n🧪 TEST MODE: Stopping after page 1')
        hasMorePages = false
      } else if (response.total_pages && page >= response.total_pages) {
        hasMorePages = false
      } else if (page >= END_PAGE) {
        console.log(`\n⏹️ Reached end page limit (${END_PAGE})`)
        hasMorePages = false
      } else if (!response.courses || response.courses.length < stats.perPage) {
        hasMorePages = false
      } else {
        page++
      }
    }

    // Final summary
    const finalCounts = await getDbCounts()
    const elapsed = Date.now() - stats.startTime

    console.log('\n' + '='.repeat(60))
    console.log('✅ Ingestion complete!')
    console.log('='.repeat(60))
    console.log(`⏱️  Duration: ${formatTime(elapsed)}`)
    console.log(`📊 This session: ${stats.clubsThisSession.toLocaleString()} clubs processed`)
    console.log(`\n📦 Final DB state:`)
    console.log(`   Clubs: ${finalCounts.clubs.toLocaleString()} (+${(finalCounts.clubs - initialCounts.clubs).toLocaleString()})`)
    console.log(`   Courses: ${finalCounts.courses.toLocaleString()} (+${(finalCounts.courses - initialCounts.courses).toLocaleString()})`)
    console.log(`   Tees: ${finalCounts.tees.toLocaleString()} (+${(finalCounts.tees - initialCounts.tees).toLocaleString()})`)
    console.log(`   Holes: ${finalCounts.holes.toLocaleString()} (+${(finalCounts.holes - initialCounts.holes).toLocaleString()})`)

    if (page < (stats.totalPages || Infinity) && page >= END_PAGE) {
      console.log(`\n💡 To continue: npm run ingest -- --start-page=${page + 1}`)
    }

  } catch (error) {
    console.error('\n❌ Error during ingestion:', error)
    console.log(`\n💡 To resume: npm run ingest -- --start-page=${page}`)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
