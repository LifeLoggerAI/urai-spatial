import Link from "next/link";
import styles from "./GroundWorld.module.css";

const artifacts = [
  {
    name: "Life Map Table",
    href: "/life-map",
    detail: "opens memory galaxy",
    className: styles.lifeMap,
    propClassName: styles.table,
  },
  {
    name: "Focus Door",
    href: "/focus",
    detail: "quiet selected room",
    className: styles.focus,
    propClassName: styles.door,
  },
  {
    name: "Replay Projector",
    href: "/replay",
    detail: "plays memory scenes",
    className: styles.replay,
    propClassName: styles.projector,
  },
  {
    name: "Mirror Pool",
    href: "/mirror",
    detail: "reflects patterns",
    className: styles.mirror,
    propClassName: styles.pool,
  },
  {
    name: "Passport Vault",
    href: "/passport",
    detail: "identity + consent",
    className: styles.passport,
    propClassName: styles.vault,
  },
  {
    name: "Status Beacon",
    href: "/status",
    detail: "system alive",
    className: styles.status,
    propClassName: styles.beacon,
  },
];

const council = [
  "Memory Guide",
  "Focus Coach",
  "Mirror Witness",
  "Grounding Ally",
  "Replay Director",
];

export default function GroundPage() {
  return (
    <main className={styles.groundWorld}>
      <div className={styles.floor} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />

      <header className={styles.topbar}>
        <Link href="/home">URAI · GROUND WORLD</Link>

        <nav aria-label="Ground navigation">
          <Link href="/home">Home</Link>
          <Link href="/life-map">Ascend</Link>
          <Link href="/council">Council</Link>
        </nav>
      </header>

      <section className={styles.caption} aria-label="Ground layer introduction">
        <p>GROUND LAYER</p>
        <h1>Walk your living world.</h1>
        <span>
          Objects and council members live on the ground, not on Home.
        </span>
      </section>

      <section className={styles.scene} aria-label="Embodied ground layer">
        {artifacts.map((artifact) => (
          <Link
            key={artifact.name}
            href={artifact.href}
            className={`${styles.object} ${artifact.className}`}
          >
            <i className={artifact.propClassName} aria-hidden="true" />
            <strong>{artifact.name}</strong>
            <small>{artifact.detail}</small>
          </Link>
        ))}

        {council.map((name, index) => (
          <Link
            key={name}
            href="/council"
            className={`${styles.avatar} ${styles[`avatar${index + 1}`]}`}
          >
            <i aria-hidden="true" />
            <strong>{name}</strong>
            <small>Talk</small>
          </Link>
        ))}

        <Link href="/home" className={styles.homeMarker}>
          <i aria-hidden="true" />
          <span>Home threshold</span>
        </Link>
      </section>
    </main>
  );
}