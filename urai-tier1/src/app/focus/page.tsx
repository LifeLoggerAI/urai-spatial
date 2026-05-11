import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import { FocusEscapeBridge } from "./FocusEscapeBridge";

export default function FocusRoute() {
  return (
    <>
      <TierOneExperience mode="focus" />
      <FocusEscapeBridge />
    </>
  );
}
