import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'

const prisma = new PrismaClient()

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const BATCH_SIZE = 200
const DELAY_MS = 500

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required')
  process.exit(1)
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

const systemPrompt = `You are a golf writer for Golf Digest. You write authoritative, confident, insider prose about golf courses. Your writing is specific, never generic. You have strong opinions but always find something worth celebrating about each course. You write for serious golfers who can smell marketing copy from a mile away. Keep it to 3 sentences, under 80 words. Never mention the course name in the write-up. Never start with "Nestled" or "Located" or "Situated". Write in present tense. Be specific about what makes this course worth playing. Naturally incorporate golf-relevant details like the region, terrain type, or signature features that golfers search for.`

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function cleanName(name: string): string {
  return name
    .replace(/\s*Former:.*$/i, '')
    .replace(/\s*Formerly:.*$/i, '')
    .replace(/\s*\(\d+\)\s*/g, '')
    .trim()
}

async function generateWriteup(club: {
  name: string
  city: string
  state: string
  accessType: string | null
  courses: { numberOfHoles: number; parTotal: number | null }[]
}): Promise<string> {
  const course = club.courses[0]
  const numberOfHoles = course?.numberOfHoles || 18
  const par = course?.parTotal || 72
  const accessType = club.accessType || 'public'

  const userPrompt = `Write a Golf Digest style editorial write-up for this golf course:
Name: ${cleanName(club.name)}
City: ${club.city}
State: ${club.state}
Number of holes: ${numberOfHoles}
Par: ${par}
Access type: ${accessType}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt
  })

  const writeup = message.content[0].type === 'text' ? message.content[0].text : ''
  return writeup.trim()
}

async function main() {
  let batchNumber = 0
  let totalProcessed = 0
  let totalErrors = 0

  console.log('='.repeat(60))
  console.log('🏌️ Wander - Write-up Generation')
  console.log('='.repeat(60))

  while (true) {
    batchNumber++

    // Get counts
    const remaining = await prisma.club.count({ where: { writtenSummary: null } })
    const total = await prisma.club.count()
    const done = total - remaining

    if (remaining === 0) {
      console.log('\n✅ All clubs have write-ups!')
      console.log(`📊 Total: ${total} clubs with write-ups`)
      break
    }

    console.log(`\n📦 Batch ${batchNumber} | Progress: ${done}/${total} (${remaining} remaining)`)

    const clubs = await prisma.club.findMany({
      where: { writtenSummary: null },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        accessType: true,
        courses: {
          select: {
            numberOfHoles: true,
            parTotal: true
          },
          take: 1
        }
      }
    })

    let batchProcessed = 0
    let batchErrors = 0

    for (const club of clubs) {
      try {
        const writeup = await generateWriteup(club)

        await prisma.club.update({
          where: { id: club.id },
          data: { writtenSummary: writeup }
        })

        batchProcessed++
        totalProcessed++
        console.log(`Generated write-up for ${club.name}`)

        // Delay between API calls to avoid rate limiting
        if (batchProcessed < clubs.length) {
          await sleep(DELAY_MS)
        }
      } catch (error) {
        batchErrors++
        totalErrors++
        console.error(`Error generating write-up for ${club.name}:`, error)
      }
    }

    console.log(`✓ Batch ${batchNumber} complete: ${batchProcessed} generated, ${batchErrors} errors`)
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ All done! ${totalProcessed} write-ups generated, ${totalErrors} errors`)
  console.log('='.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
