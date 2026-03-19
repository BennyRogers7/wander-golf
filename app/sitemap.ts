import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'
import { getStateSlug, isValidUSState } from '@/lib/states'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://wander.golf'

  // Get all clubs with their state and city info
  const clubs = await prisma.club.findMany({
    select: {
      slug: true,
      state: true,
      city: true,
      updatedAt: true,
    },
  })

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // Get unique states (only valid US states)
  const statesSet = new Set<string>()
  clubs.forEach(club => {
    if (isValidUSState(club.state)) {
      statesSet.add(getStateSlug(club.state))
    }
  })

  const statePages: MetadataRoute.Sitemap = Array.from(statesSet).map(stateSlug => ({
    url: `${baseUrl}/courses/${stateSlug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Get unique state/city combinations
  const citiesMap = new Map<string, Date>()
  clubs.forEach(club => {
    if (isValidUSState(club.state)) {
      const stateSlug = getStateSlug(club.state)
      const citySlug = club.city.toLowerCase().replace(/\s+/g, '-')
      const key = `${stateSlug}/${citySlug}`
      const existing = citiesMap.get(key)
      if (!existing || club.updatedAt > existing) {
        citiesMap.set(key, club.updatedAt)
      }
    }
  })

  const cityPages: MetadataRoute.Sitemap = Array.from(citiesMap.entries()).map(([path, updatedAt]) => ({
    url: `${baseUrl}/courses/${path}`,
    lastModified: updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Course profile pages
  const coursePages: MetadataRoute.Sitemap = clubs
    .filter(club => isValidUSState(club.state))
    .map(club => {
      const stateSlug = getStateSlug(club.state)
      const citySlug = club.city.toLowerCase().replace(/\s+/g, '-')
      return {
        url: `${baseUrl}/courses/${stateSlug}/${citySlug}/${club.slug}`,
        lastModified: club.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }
    })

  return [...staticPages, ...statePages, ...cityPages, ...coursePages]
}
