
import "./globals.css";

export const metadata = {
  title: "URAI",
  description: "URAI Spatial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "black",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
