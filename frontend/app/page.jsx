"use client";

import { Suspense } from "react";

import { LoginScreen } from "../components/login-screen";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="auth-panel">Loading...</div>}>
      <LoginScreen />
    </Suspense>
  );
}
