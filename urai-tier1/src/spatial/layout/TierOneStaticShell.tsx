import type { ReactNode } from "react";
import styles from "./TierOneStaticShell.module.css";

type TierOneStaticShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  align?: "center" | "top";
};

export function TierOneStaticShell({ eyebrow, title, description, children, align = "center" }: TierOneStaticShellProps) {
  return (
    <main className={styles.shell} data-align={align}>
      <div className={styles.stars} aria-hidden />
      <section className={styles.card}>
        <div className="tier-one-route-card__eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        <div className={styles.body}>{children}</div>
      </section>
    </main>
  );
}
