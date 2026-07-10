import UraiQuestEntryWorldV2 from '@/app/spatial/ar-vr/UraiQuestEntryWorldV2'

export const metadata = {
  title: 'URAI XR World',
  description: 'The canonical URAI XR route opens into the Quest / AR / VR entry chamber.',
}

export default function XrPage() {
  return (
    <>
      <h1 className="sr-only">URAI XR World</h1>
      <UraiQuestEntryWorldV2 />
    </>
  )
}
