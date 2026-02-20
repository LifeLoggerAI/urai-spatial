import ErrorBoundary from '../src/components/ErrorBoundary';

export const metadata = {
  title: "URAI Spatial (WebXR)",
  description: "URAI Spatial Engine reference runtime"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#000", color: "#fff" }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
