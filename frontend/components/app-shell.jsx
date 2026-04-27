"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ChatPanel } from "./chat-panel";
import { useSession } from "./session-context";

const NAV_ITEMS = [
  {
    href: "/overview",
    label: "Overview",
    hint: "Dashboard and key metrics",
    icon: OverviewIcon
  },
  {
    href: "/programs",
    label: "Programs",
    hint: "Portfolio performance tracking",
    icon: ProgramsIcon
  },
  {
    href: "/anomalies",
    label: "Issues",
    hint: "Anomaly detection and alerts",
    icon: IssuesIcon
  },
  {
    href: "/data-sources",
    label: "Data",
    hint: "Connected data sources",
    icon: DataIcon
  },
  {
    href: "/reports",
    label: "Briefs",
    hint: "Executive reports and briefs",
    icon: BriefsIcon
  }
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { ready, session, signOut } = useSession();
  const isLoginPage = pathname === "/" || pathname === "/login";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!ready || session || isLoginPage) return;
    const returnTo = pathname && pathname !== "/" ? `?returnTo=${encodeURIComponent(pathname)}` : "";
    router.replace(`/${returnTo}`);
  }, [isLoginPage, pathname, ready, router, session]);

  if (isLoginPage) {
    return <main id="main-content" className="auth-main">{children}</main>;
  }

  if (ready && !session) {
    return <main id="main-content" className="main"><div className="page-body">Redirecting to login...</div></main>;
  }

  return (
    <div className="app-shell">
      <aside className={`side-nav ${menuOpen ? "is-open" : ""}`}>
        <div className="side-nav-brand">
          <img
            className="brand-logo"
            src="/WalkerMillerSilver.png"
            alt="Walker-Miller Energy Services"
          />
        </div>
        <button
          type="button"
          className="secondary mobile-nav-toggle"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          Menu
        </button>
        <nav id="main-navigation" aria-label="Main navigation">
          <ul className="side-nav-list">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    className={`side-nav-link${active ? " is-active" : ""}`}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="side-nav-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="side-nav-copy">
                      <span className="side-nav-label">{item.label}</span>
                      <span className="side-nav-hint">{item.hint}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="side-nav-footer">
          <div className="side-nav-profile">
            <span className="context-label">Profile</span>
            <strong>{session?.user?.name ?? "Signed in user"}</strong>
            {session?.user?.email ? <span>{session.user.email}</span> : null}
            {session ? (
              <button type="button" className="side-nav-signout" onClick={signOut}>
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </aside>
      <main id="main-content" className="main">{children}</main>
      <ChatPanel />
    </div>
  );
}

function OverviewIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ProgramsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function IssuesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M12 3L21.5 19.5H2.5L12 3z" />
      <line x1="12" y1="10" x2="12" y2="14" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DataIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="6.5" rx="8" ry="3" />
      <path d="M4 6.5v5c0 1.66 3.582 3 8 3s8-1.34 8-3v-5" />
      <path d="M4 11.5v5c0 1.66 3.582 3 8 3s8-1.34 8-3v-5" />
    </svg>
  );
}

function BriefsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" strokeLinecap="round" />
      <line x1="8" y1="16" x2="13" y2="16" strokeLinecap="round" />
    </svg>
  );
}
