import { ReleasesAdminPanel } from "./ReleasesAdminPanel";

export function AdminShell() {
  return (
    <main aria-label="URAI admin">
      <h1>URAI Admin</h1>
      <ReleasesAdminPanel />
    </main>
  );
}
