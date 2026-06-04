import ReleasesAdminPanel from "./ReleasesAdminPanel";

export function AdminShell() {
  return (
    <main aria-labelledby="admin-shell-heading">
      <header>
        <p>Admin</p>
        <h1 id="admin-shell-heading">URAI Operations</h1>
      </header>

      <section aria-labelledby="admin-release-section-heading">
        <h2 id="admin-release-section-heading">Releases</h2>
        <ReleasesAdminPanel />
      </section>
    </main>
  );
}

export default AdminShell;
