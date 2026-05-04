import CognitiveMirror from "@/components/CognitiveMirror";
import { SpatialShell } from "@/spatial/layout/SpatialShell";

export default function HomeRoute() {
  return <SpatialShell mode="overview" sourceBadge="demo"><CognitiveMirror /></SpatialShell>;
}
