import type { ReactNode } from "react";

type TierOneStaticShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  align?: "center" | "top";
};

export function TierOneStaticShell({ eyebrow, title, description, children, align = "center" }: TierOneStaticShellProps) {
  return (
    <main className="tier-one-static-shell shell" data-align={align}>
      <div className="tier-one-static-shell__stars stars" aria-hidden />
      <section className="tier-one-static-shell__card card">
        <div className="tier-one-route-card__eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        <div className="tier-one-static-shell__body body">{children}</div>
      </section>
    </main>
  );
}
