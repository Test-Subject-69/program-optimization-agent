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
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
