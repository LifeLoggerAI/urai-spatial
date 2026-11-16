import type { MetadataRoute } from 'next'
import { blockedRobotsRoute } from '../lib/release/discoverability'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return blockedRobotsRoute()
}
