export type MemoryPreview = {
  title: string
  date: string
  people: string[]
  place: string
  context: string
}

export const memoryPreviews: MemoryPreview[] = [
  {
    title: 'Project planning session',
    date: 'Recent',
    people: ['Founder', 'Advisor', 'Builder'],
    place: 'Workspace',
    context: 'Connected to launch planning, technical review, and public readiness.',
  },
  {
    title: 'Family explanation moment',
    date: 'Recent',
    people: ['Founder', 'Family'],
    place: 'Home',
    context: 'A real-world explanation of spatial memory and personal context.',
  },
  {
    title: 'Route audit checkpoint',
    date: 'Launch cycle',
    people: ['URAI'],
    place: 'Public app',
    context: 'Review of Home, Ground, Life Map, Replay, Mirror, Passport, and Status.',
  },
]
