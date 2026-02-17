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
      <body>
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            background: "black",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
