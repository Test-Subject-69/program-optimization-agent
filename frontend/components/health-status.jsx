"use client";

import { useEffect, useState } from "react";
import { loadHealth } from "../lib/api";

export function HealthStatus() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadHealth()
        .then(setHealth)
        .catch(() => setHealth({ repository: "offline", ai: "offline" }));
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="system-card">
      <span>Backend</span>
      <strong>{health?.repository ?? "checking"}</strong>
      <span>AI: {health?.ai ?? "checking"}</span>
    </div>
  );
}
