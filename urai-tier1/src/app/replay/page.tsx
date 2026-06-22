import { MemoryRouteClient } from "@/spatial/layout/MemoryRouteClient";

export const metadata = {
  title: "URAI Replay",
  description: "URAI Replay turns a selected memory thread into a cinematic route through time.",
};

export default function ReplayRoutePage() {
  return <MemoryRouteClient mode="replay" />;
}
