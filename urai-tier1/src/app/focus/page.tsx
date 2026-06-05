import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import { FocusEscapeBridge } from "./FocusEscapeBridge";
import { FocusPlaceDoor } from "./FocusPlaceDoor";

type FocusRouteProps = {
  searchParams?: Promise<{
    manifestId?: string;
  }>;
};

export default async function FocusRoute({ searchParams }: FocusRouteProps) {
  const params = await searchParams;
  return (
    <>
      <TierOneExperience mode="focus" />
      <FocusEscapeBridge />
      <FocusPlaceDoor manifestId={params?.manifestId} />
    </>
  );
}
