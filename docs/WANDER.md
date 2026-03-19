# Wander — Project Brief

## Overview
National golf course directory + AI concierge. The best golf directory ever built.

## Brand
**Name:** Wander
**Domain:** wander.golf
**Also own:** wandergolf.co (redirect to wander.golf)
**Previous name:** Ace Golf Guide (project folder still named ace-golf-guide)

## Stack
Next.js (app router, TypeScript, Tailwind), Prisma, Neon (Postgres), Vercel, Cloudflare R2, Stripe

## Homepage Copy
Headline: "Where are you playing next?"
Subhead: "Every course. Everywhere."

## Four Intent Cards (first person)
1. "Find my next round"
2. "I'm planning a golf trip"
3. "I want to find courses worth traveling for"
4. "Show me something I've never heard of"

## Key Features
- Course profiles (editorial, AI-generated write-ups)
- AI concierge (natural language trip planning)
- Golf Passport (optional user profile — handicap, played, bucket list, shareable)
- Greens Report (crowdsourced — recently punched greens y/n, expires 30 days)
- Played It (one-tap mechanic, triggers Greens Report prompt)
- Locals Pick badge (synthesized from review sentiment, not paid)
- Wander Approved badge (editorial medallion for quality courses)
- Surprise Me (hidden gem near you)

## Design Direction
- Editorial, confident, clean
- Colors: deep forest green #1a3a2a + off-white #f8f5ef + gold #c9a84c
- Typography: serif headlines (Playfair Display) + sans body (Inter)
- Photography-forward, full bleed course aerials
- Mobile first
- No ads, no popups, no lead-gen extraction

## UGC & Engagement Features
- Played It (one-tap, zero friction, no account needed)
- Greens Report (crowdsourced, 30-day expiry, y/n recently punched)
- Quick polls per visit: pace of play (fast/normal/slow), worth the price (yes/no/great value)
- Course reviews (text + rating, requires Golf Passport)
- Photo uploads (requires Golf Passport)
- Community Rankings — living top 100 updated monthly from real data

## Engagement Loop
Play → Played It tap → 3 quick polls → see community rating → browse similar courses → plan next round

## Monetization — Claimed Listings
- Every unclaimed profile shows "Is this your course? Claim this listing"
- Claim flow → Stripe → featured placement upsell
- Same model as HereIsMyGuy but higher value customers

Additional monetization:
1. Claimed listings — course owners pay via Stripe
2. Featured placement — top of city pages
3. Tee time affiliate — GolfNow bookings
4. Trip packages — courses + lodging bundles

## Wander Approved Badge
- Editorial medallion awarded to quality courses
- Not pay-to-play — earned through rating threshold, data completeness, community engagement
- Aspirational — courses ask "how do we get Wander Approved?"
- Inbound sales motion

## Course Profile Page Components (final)
1. Hero — full bleed photo, course name, city/state, Wander Approved medallion, Locals Pick badge
2. At a Glance — par, yardage, slope, rating, price range, walkable, access type, designer, year established
3. Editorial write-up — AI generated, who its for, signature hole, best time, course style
4. Community signals — Played It count, community rating, pace of play, worth the price polls
5. Greens Report — crowdsourced, 30-day expiry
6. Tee sheet — all tees by gender
7. Actions — Book Tee Time (GolfNow), Played It, Save, Find courses like this (concierge)
8. Nearby courses
9. Claim this listing (if unclaimed)

## Database Models Added
- PlayedIt (sessionId, ratings, polls, optional userId)
- CourseReview (text reviews, ratings)
- GreensReport (punched y/n, 30-day expiry) — TODO
- TripItinerary (concierge sessions)

Club model additions:
- wanderApproved, wanderApprovedAt
- communityRating, totalPlayedIt

## Data Strategy
- API source: golfcourseapi.com (rate limited — resume ingest tonight)
- 25 clubs in DB currently, ~30K total expected
- Rate limit likely resets midnight UTC (~6-7pm CST)
- Resume with: npm run ingest (script has retry logic)

## URL Structure
/courses — browse all states
/courses/[state] — state page
/courses/[state]/[city] — city page
/courses/[state]/[city]/[slug] — course profile
Future: /courses/[state]/[region]/[city]/[slug]

## Key Filters/Sort
Par, slope, course rating, yardage, designer/architect, year established,
access type, walkable, price range, course style, driving range, dress code,
greens recently punched

## Build Order
1. SEO foundation — state pages, city pages, course profiles (static generation) ✓
2. Editorial layer — AI-generated write-ups per course
3. Concierge — natural language search + trip planner

## Tech Notes
- Prisma reads .env not .env.local
- Build script: prisma generate && next build
- Neon connection string in .env
- Always read this file at start of every Claude Code session
