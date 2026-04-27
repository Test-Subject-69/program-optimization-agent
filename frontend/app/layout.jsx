import { AppShell } from "../components/app-shell";
import { SessionProvider } from "../components/session-context";
import "./globals.css";

export const metadata = {
  title: "Walker-Miller Program Optimization Agent",
  description: "Executive program performance, anomaly detection, and AI-generated briefs for Walker-Miller."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
