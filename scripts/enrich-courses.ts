import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

let prisma = new PrismaClient()

const BASE_URL = 'https://api.golfcourseapi.com/v1'
const API_KEY = process.env.GOLF_API_KEY
const TEST_MODE = process.argv.includes('--test')
const RECONNECT_INTERVAL = 500
const PROGRESS_INTERVAL = 100

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

interface ApiCourseDetail {
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

interface ClubToEnrich {
  id: string
  apiId: number
  name: string
  courses: {
    id: string
    name: string
  }[]
}

interface SessionStats {
  startTime: number
  processed: number
  enriched: number
  skipped: number
  failed: number
  total: number
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

function logProgress(stats: SessionStats): void {
  const elapsed = Date.now() - stats.startTime
  const rate = stats.processed / (elapsed / 1000)
  const remaining = stats.total - stats.processed
  const eta = remaining / rate

  console.log(
    `📊 Progress: ${stats.processed}/${stats.total} | ` +
    `Enriched: ${stats.enriched} | Skipped: ${stats.skipped} | Failed: ${stats.failed} | ` +
    `ETA: ${formatTime(eta * 1000)}`
  )
}

async function reconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
  prisma = new PrismaClient()
  console.log('🔄 Reconnected to database')
}

async function fetchCourseDetail(apiId: number, retries = 3): Promise<ApiCourseDetail | null> {
  const url = `${BASE_URL}/courses/${apiId}`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Key ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.course || data
      }

      if (response.status === 404) {
        console.log(`   ⚠️ Course ${apiId} not found in API`)
        return null
      }

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 5000 // 10s, 20s, 40s
        console.log(`   ⏳ Rate limited. Waiting ${waitTime / 1000}s before retry ${attempt}/${retries}...`)
        await sleep(waitTime)
        continue
      }

      console.log(`   ⚠️ API error ${response.status} for course ${apiId}`)
      return null
    } catch (error) {
      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000
        console.log(`   ⚠️ Network error, retrying in ${waitTime / 1000}s...`)
        await sleep(waitTime)
        continue
      }
      console.log(`   ❌ Failed to fetch course ${apiId}:`, error)
      return null
    }
  }

  return null
}

async function getClubsWithoutTees(): Promise<ClubToEnrich[]> {
  const clubs = await prisma.club.findMany({
    where: {
      courses: {
        every: {
          tees: {
            none: {}
          }
        }
      }
    },
    select: {
      id: true,
      apiId: true,
      name: true,
      courses: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: {
      apiId: 'asc'
    }
  })

  return clubs
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

async function processTees(courseId: string, tees: ApiTeeSet): Promise<number> {
  let teeCount = 0

  if (tees.male) {
    for (const apiTee of tees.male) {
      const teeId = await upsertTee(courseId, apiTee, 'Male')
      if (apiTee.holes && apiTee.holes.length > 0) {
        await upsertHolesBatch(teeId, apiTee.holes)
      }
      teeCount++
    }
  }

  if (tees.female) {
    for (const apiTee of tees.female) {
      const teeId = await upsertTee(courseId, apiTee, 'Female')
      if (apiTee.holes && apiTee.holes.length > 0) {
        await upsertHolesBatch(teeId, apiTee.holes)
      }
      teeCount++
    }
  }

  return teeCount
}

async function enrichClub(club: ClubToEnrich): Promise<boolean> {
  const detail = await fetchCourseDetail(club.apiId)

  if (!detail) {
    return false
  }

  if (!detail.tees || (!detail.tees.male?.length && !detail.tees.female?.length)) {
    return false
  }

  // Find the matching course or use first one
  const course = club.courses[0]
  if (!course) {
    return false
  }

  // Update course with any additional data
  await prisma.course.update({
    where: { id: course.id },
    data: {
      numberOfHoles: detail.num_holes || 18,
      parTotal: detail.par_total,
    },
  })

  // Process tees
  const teeCount = await processTees(course.id, detail.tees)

  return teeCount > 0
}

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('🏌️ Wander - Course Enrichment')
  console.log('='.repeat(60))

  if (TEST_MODE) {
    console.log('🧪 TEST MODE: Processing first 10 clubs only\n')
  }

  console.log(`API Key: ${API_KEY?.substring(0, 8)}...`)

  // Get clubs that need enrichment
  console.log('\n📡 Querying clubs without tee data...')
  let clubsToEnrich = await getClubsWithoutTees()

  if (clubsToEnrich.length === 0) {
    console.log('✅ All clubs already have tee data!')
    await prisma.$disconnect()
    return
  }

  console.log(`📦 Found ${clubsToEnrich.length.toLocaleString()} clubs to enrich\n`)

  if (TEST_MODE) {
    clubsToEnrich = clubsToEnrich.slice(0, 10)
    console.log(`🧪 TEST MODE: Limited to ${clubsToEnrich.length} clubs\n`)
  }

  const stats: SessionStats = {
    startTime: Date.now(),
    processed: 0,
    enriched: 0,
    skipped: 0,
    failed: 0,
    total: clubsToEnrich.length,
  }

  try {
    for (const club of clubsToEnrich) {
      try {
        const enriched = await enrichClub(club)

        if (enriched) {
          stats.enriched++
        } else {
          stats.skipped++
        }
      } catch (error) {
        console.log(`   ❌ Error enriching ${club.name}:`, error)
        stats.failed++
      }

      stats.processed++

      // Reconnect periodically
      if (stats.processed % RECONNECT_INTERVAL === 0) {
        await reconnectPrisma()
      }

      // Log progress every PROGRESS_INTERVAL records
      if (stats.processed % PROGRESS_INTERVAL === 0) {
        logProgress(stats)
      }

      // Rate limiting: 100ms delay between API calls
      await sleep(100)
    }

    // Final summary
    const elapsed = Date.now() - stats.startTime

    console.log('\n' + '='.repeat(60))
    console.log('✅ Enrichment complete!')
    console.log('='.repeat(60))
    console.log(`⏱️  Duration: ${formatTime(elapsed)}`)
    console.log(`📊 Results:`)
    console.log(`   Processed: ${stats.processed.toLocaleString()}`)
    console.log(`   Enriched: ${stats.enriched.toLocaleString()}`)
    console.log(`   Skipped (no tee data in API): ${stats.skipped.toLocaleString()}`)
    console.log(`   Failed: ${stats.failed.toLocaleString()}`)

    // Get final tee counts
    const teeCount = await prisma.tee.count()
    const holeCount = await prisma.hole.count()
    console.log(`\n📦 Current DB state:`)
    console.log(`   Tees: ${teeCount.toLocaleString()}`)
    console.log(`   Holes: ${holeCount.toLocaleString()}`)

  } catch (error) {
    console.error('\n❌ Error during enrichment:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
