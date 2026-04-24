"use client";

import { useEffect, useState } from "react";
import { analyzePortfolio } from "../lib/ai-api";

export function InsightBanner() {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    analyzePortfolio()
      .then((data) => setInsight(data))
      .catch(() => setInsight(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="insight-banner">
        <div className="insight-banner-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 5.5v4M9 12v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <strong>AI Agent</strong>
          </div>
          <span className="insight-banner-mode">analyzing...</span>
        </div>
        <div className="insight-banner-body">
          <div className="skeleton" style={{ height: 14, width: "90%", marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 14, width: "70%" }} />
        </div>
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div className="insight-banner">
      <div className="insight-banner-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 5.5v4M9 12v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <strong>AI Agent</strong>
          <span className="insight-banner-stats">
            {insight.context?.atRiskCount > 0
              ? `${insight.context.atRiskCount} at risk`
              : "all healthy"}
            {insight.context?.highPriorityIssues > 0
              ? ` · ${insight.context.highPriorityIssues} high-priority issues`
              : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="insight-banner-mode">{insight.mode === "openai" ? "AI-powered" : "rule-based"}</span>
          <button
            type="button"
            className="insight-banner-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand insight" : "Collapse insight"}
          >
            {collapsed ? "+" : "\u2212"}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="insight-banner-body">
          {insight.insight.split("\n").map((line, i) =>
            line.trim() ? <p key={i}>{line}</p> : null
          )}
        </div>
      )}
    </div>
  );
}
