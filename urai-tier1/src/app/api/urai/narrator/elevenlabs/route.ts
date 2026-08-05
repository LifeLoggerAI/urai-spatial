import { handleElevenLabsSynthesis } from '@/lib/server/elevenlabs-synthesis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleElevenLabsSynthesis(request, 'narrator')
}
