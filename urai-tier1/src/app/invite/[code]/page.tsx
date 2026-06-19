import { InvitePageClient } from "./InvitePageClient";

const STATIC_INVITE_CODES = ["URAI-DEMO", "EARLY-ACCESS", "DEMO-INVITE"];

export const dynamicParams = false;

export function generateStaticParams() {
  return STATIC_INVITE_CODES.map((code) => ({
    code,
  }));
}

type InvitePageProps = {
  params: Promise<{ code: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;

  return <InvitePageClient code={code} />;
}
