import UraiV1Experience from "@/components/urai/UraiV1Experience";

type PublicProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { slug } = await params;
  const profileLabel = slug === "adamclamp" ? "Adam Clamp Sample Field" : "Public Sample Field";

  return (
    <main aria-labelledby="public-profile-heading">
      <section>
        <p>Public sample profile</p>
        <h1 id="public-profile-heading">{profileLabel}</h1>
        <p>This demo uses sample data.</p>
      </section>

      <UraiV1Experience mode="demo" profileLabel={profileLabel} />

      <section aria-labelledby="profile-media-heading">
        <h2 id="profile-media-heading">Media-safe walkthrough</h2>
        <p>
          This page can support founder demo clips, screenshots, and social crops after approved launch assets are added. No private account state is shown.
        </p>
      </section>

      <section aria-labelledby="profile-privacy-heading">
        <h2 id="profile-privacy-heading">Privacy promise</h2>
        <p>
          Public profile media should use sample data only and avoid raw IDs, debug UI, private Shadow content, and private Legacy content.
        </p>
      </section>
    </main>
  );
}
