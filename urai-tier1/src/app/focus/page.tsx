import { MemoryRouteClient } from "@/spatial/layout/MemoryRouteClient";

export const metadata = {
  title: "URAI Focus",
  description: "URAI Focus opens one selected memory from the Life Map and keeps Replay one step away.",
};

export default function FocusRoutePage() {
  return <MemoryRouteClient mode="focus" />;
}
