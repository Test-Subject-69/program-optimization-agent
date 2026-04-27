"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { FieldMessage } from "./ui";
import { isSupabaseAuthConfigured } from "../lib/supabase";
import { useSession } from "./session-context";

function normalizeReturnTo(value, fallback = "/overview") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode, ready, session, signInWithPassword, startDemoSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const configured = isSupabaseAuthConfigured();
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"));

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (ready && session) router.replace(returnTo);
  }, [ready, returnTo, router, session]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const nextFieldErrors = { email: "", password: "" };
    if (!email.trim()) {
      nextFieldErrors.email = "Enter your email address.";
    } else if (!email.includes("@")) {
      nextFieldErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      nextFieldErrors.password = "Enter your password.";
    }
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) return;

    setSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
      router.replace(returnTo);
    } catch (nextError) {
      setError(nextError.message ?? "Unable to sign in. Check your credentials and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoStart() {
    setError("");
    setSubmitting(true);
    try {
      await startDemoSession("admin");
      router.replace(returnTo);
    } catch (nextError) {
      setError(nextError.message ?? "Unable to start the demo. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <aside className="auth-visual" aria-hidden="true">
        <div className="auth-visual-glow" />
        <div className="auth-visual-content">
          <img
            className="auth-visual-logo"
            src="/WalkerMillerSilver.png"
            alt=""
          />
          <h1 className="auth-visual-title">
            Program<br />
            <strong>Optimization Agent</strong>
          </h1>
          <p className="auth-visual-tagline">
            Executive program performance, anomaly detection, and AI-generated briefs for Walker-Miller Energy Services.
          </p>
        </div>
      </aside>

      <section className="auth-form-panel" aria-labelledby="login-title">
        <div className="auth-form-inner">
          <header className="auth-form-header">
            <h2 id="login-title">Sign in to your account</h2>
            <p>Enter your credentials to continue</p>
          </header>

          {!configured ? (
            <div className="notice auth-notice" role="status" style={{ margin: 0 }}>
              Supabase Auth is not configured. Use the demo session to explore, or configure Supabase environment variables and restart.
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setFieldErrors((prev) => ({ ...prev, email: "" })); }}
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                disabled={mounted && (!configured || mode !== "supabase" || submitting)}
              />
              <FieldMessage>{fieldErrors.email}</FieldMessage>
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => { setPassword(event.target.value); setFieldErrors((prev) => ({ ...prev, password: "" })); }}
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.password)}
                disabled={mounted && (!configured || mode !== "supabase" || submitting)}
              />
              <FieldMessage>{fieldErrors.password}</FieldMessage>
            </label>
            {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}
            <button className="auth-submit" type="submit" disabled={mounted && (!configured || mode !== "supabase" || submitting || !ready)}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {!configured ? (
            <button type="button" className="secondary" onClick={handleDemoStart} disabled={mounted && (!ready || submitting)}>
              Start demo session
            </button>
          ) : null}

          <p className="form-note">Accounts are created by the Supabase project admin.</p>
        </div>
      </section>
    </>
  );
}
