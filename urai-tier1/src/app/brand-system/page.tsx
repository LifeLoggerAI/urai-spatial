import { UraiSymbol } from "@/brand/UraiSymbol";
import { URAI_BRAND_REGISTRY, URAI_PRODUCT_KEYS } from "@/brand/urai-brand.registry";

function publicDemoRoutesAllowed() {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES === "true" || process.env.NODE_ENV !== "production";
}

export default function BrandSystemPage() {
  if (!publicDemoRoutesAllowed()) {
    return (
      <main style={{ minHeight: "100vh", padding: 48, background: "#f7f8fb", color: "#0b0f1a" }}>
        <section style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, opacity: 0.6 }}>
            URAI Brand System
          </p>
          <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: "12px 0 14px" }}>
            Brand system locked
          </h1>
          <p style={{ maxWidth: 760, fontSize: 18, lineHeight: 1.6, opacity: 0.72 }}>
            This route is disabled in production unless NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES is explicitly enabled.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: 48, background: "#f7f8fb", color: "#0b0f1a" }}>
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, opacity: 0.6 }}>
          URAI Brand System
        </p>
        <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: "12px 0 14px" }}>
          Master Symbol System
        </h1>
        <p style={{ maxWidth: 760, fontSize: 18, lineHeight: 1.6, opacity: 0.72 }}>
          One core symbol architecture with product-specific modifiers across the URAI family: Labs,
          Foundation, Studio, Analytics, Content, Communications, Marketing, Jobs, Privacy, Investors,
          spatial tools, and package tooling.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 24,
          marginTop: 42
        }}>
          {URAI_PRODUCT_KEYS.map((key) => {
            const product = URAI_BRAND_REGISTRY[key];
            return (
              <article key={key} style={{
                background: "#fff",
                border: "1px solid rgba(11,15,26,0.08)",
                borderRadius: 24,
                padding: 24,
                minHeight: 310,
                boxShadow: "0 18px 48px rgba(11,15,26,0.06)"
              }}>
                <div style={{ display: "flex", justifyContent: "center", minHeight: 170 }}>
                  <UraiSymbol product={key} size={145} />
                </div>
                <div style={{ marginTop: 18 }}>
                  <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: product.accent }}>
                    {product.category}
                  </p>
                  <h2 style={{ margin: "8px 0 6px", fontSize: 20 }}>{product.name}</h2>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, opacity: 0.68 }}>{product.tagline}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}