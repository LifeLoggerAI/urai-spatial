import { notFound } from "next/navigation";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

type PublicUserPageProps = {
  params: Promise<{ handle: string }>;
};

const PUBLIC_DEMO_HANDLES = new Set(["adamclamp"]);

export function generateStaticParams() {
  return Array.from(PUBLIC_DEMO_HANDLES).map((handle) => ({ handle }));
}

export default async function PublicUserPage({ params }: PublicUserPageProps) {
  const { handle } = await params;
  const normalizedHandle = handle.toLowerCase();

  if (!PUBLIC_DEMO_HANDLES.has(normalizedHandle)) {
    notFound();
  }

  return (
    <TierOneExperience
      mode="demo"
      eyebrow="Public URAI Spatial Demo"
      title={`@${normalizedHandle} public Life Map preview`}
      description="A public-safe URAI Spatial route for validating the V1 demo link without exposing private memory, passive signal, relationship, biometric, or account data."
    />
  );
}
