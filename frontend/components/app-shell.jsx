"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { loadHealth } from "../lib/api";
import { ChatPanel } from "./chat-panel";
import { useSession } from "./session-context";

const NavIcons = {
  Overview: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="1" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="1" y="10" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="10" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  Programs: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 5a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  Issues: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2L16.5 15H1.5L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="9" y1="7.5" x2="9" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="13" r="0.75" fill="currentColor"/>
    </svg>
  ),
  Data: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <ellipse cx="9" cy="5" rx="6" ry="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 5v4c0 1.38 2.686 2.5 6 2.5S15 10.38 15 9V5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 9v4c0 1.38 2.686 2.5 6 2.5S15 14.38 15 13V9" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  Briefs: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="6" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

const navItems = [
  { href: "/overview", label: "Overview" },
  { href: "/programs", label: "Programs" },
  { href: "/anomalies", label: "Issues" },
  { href: "/data-sources", label: "Data" },
  { href: "/reports", label: "Briefs" }
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [health, setHealth] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, ready, role, session, signOut, switchRole } = useSession();
  const isLoginPage = pathname === "/" || pathname === "/login";

  useEffect(() => {
    loadHealth()
      .then(setHealth)
      .catch(() => setHealth({ repository: "offline", ai: "offline" }));
  }, []);

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
        <div className="side-nav-header">
          <div className="brand-lockup">
            <strong>Walker-Miller</strong>
            <span>Program Optimization Agent</span>
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
        </div>
        <nav id="main-navigation" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                className={active ? "active" : ""}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
                  background: active ? "var(--surface-2, rgba(0,0,0,0.06))" : undefined,
                  paddingLeft: active ? "calc(var(--nav-link-px, 1rem) - 3px)" : undefined,
                }}
              >
                {NavIcons[item.label]}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="system-card" style={{ borderTop: "1px solid var(--border, rgba(0,0,0,0.1))", marginTop: "auto" }}>
          <p className="system-card-title text-secondary" style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>System</p>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <span
              style={{
                display: "inline-block",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: health?.repository === "online" ? "var(--success, #22c55e)" : health?.repository === "offline" ? "var(--danger, #ef4444)" : "var(--warning, #f59e0b)",
                flexShrink: 0,
              }}
            />
            <strong style={{ fontSize: "0.8rem" }}>{health?.repository ?? "checking"}</strong>
          </div>
          <span className="text-secondary" style={{ fontSize: "0.75rem" }}>AI: {health?.ai ?? "checking"}</span>
          <span className="text-secondary" style={{ fontSize: "0.75rem" }}>Auth: {mode === "supabase" ? "Supabase" : "Demo"}</span>
          {mode === "demo" ? (
            <label className="system-role">
              <span>Role</span>
              <select
                value={role}
                onChange={(event) => switchRole(event.target.value)}
                disabled={!ready}
                aria-label="Demo role"
              >
                <option value="read-only">Read only</option>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          ) : (
            <div className="system-identity">
              <span>Role</span>
              <strong>{role}</strong>
            </div>
          )}
          <span className="text-secondary" style={{ fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.name ?? "Starting demo session"}</span>
          {session ? (
            <button type="button" className="secondary" onClick={signOut} style={{ marginTop: "4px" }}>
              Sign out
            </button>
          ) : null}
        </div>
      </aside>
      <main id="main-content" className="main">{children}</main>
      <ChatPanel />
    </div>
  );
}
