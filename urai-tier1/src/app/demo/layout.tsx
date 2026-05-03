export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      background: "#02060f",
      color: "white",
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      {children}
    </div>
  );
}
