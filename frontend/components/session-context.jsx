"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { createDemoSession, getAuthSession, setAuthSession } from "../lib/api";
import { getSupabaseClient, isSupabaseAuthConfigured, toAppSession } from "../lib/supabase";

const SessionContext = createContext({
  session: null,
  mode: "demo",
  role: "read-only",
  ready: false,
  startDemoSession: async () => {},
  signInWithPassword: async () => {},
  signOut: async () => {},
  switchRole: async () => {}
});

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const supabaseConfigured = isSupabaseAuthConfigured();

  useEffect(() => {
    let cancelled = false;
    let subscription = null;

    async function initialize() {
      if (supabaseConfigured) {
        const supabase = getSupabaseClient();
        const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (cancelled) return;
          const appSession = toAppSession(nextSession);
          setAuthSession(appSession);
          setSession(appSession);
        });
        subscription = listener.data.subscription;

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const appSession = toAppSession(data.session);
        if (!cancelled) {
          setAuthSession(appSession);
          setSession(appSession);
          setReady(true);
        }
        return;
      }

      const stored = getAuthSession();
      if (stored) {
        if (!cancelled) {
          setSession(stored);
          setReady(true);
        }
        return;
      }

      if (!cancelled) setReady(true);
    }

    initialize().catch(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [supabaseConfigured]);

  const value = useMemo(
    () => ({
      session,
      mode: supabaseConfigured ? "supabase" : "demo",
      role: session?.user?.role ?? "read-only",
      ready,
      async startDemoSession(role = "admin") {
        if (supabaseConfigured) return null;
        const nextSession = await createDemoSession(role);
        setAuthSession(nextSession);
        setSession(nextSession);
        return nextSession;
      },
      async signInWithPassword(email, password) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase Auth is not configured");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const appSession = toAppSession(data.session);
        if (!appSession) throw new Error("Supabase did not return a session");
        setAuthSession(appSession);
        setSession(appSession);
        return appSession;
      },
      async signOut() {
        if (supabaseConfigured) {
          const supabase = getSupabaseClient();
          if (supabase) await supabase.auth.signOut();
        }
        setAuthSession(null);
        setSession(null);
      },
      async switchRole(role) {
        if (supabaseConfigured) return;
        const nextSession = await createDemoSession(role);
        setAuthSession(nextSession);
        setSession(nextSession);
      }
    }),
    [ready, session, supabaseConfigured]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
