import OpenAI from "openai";
import { env } from "../config/env.js";
import {
  buildDashboard,
  detectProgramAnomalies,
  enrichProgram,
  recommendActions,
  summarizePortfolio
} from "@program-optimization/shared";

const SYSTEM_PROMPT = `You are the Walker-Miller Program Optimization Agent — an AI advisor for Walker-Miller Energy Services, a clean-energy and weatherization services company based in Detroit, Michigan.

Your role is to help program managers, executives, and operators understand portfolio health, identify risks, and take action. You have access to real-time portfolio data including:
- Program performance metrics (delivery %, staffing, compliance, health scores)
- Anomaly detection results (issues flagged by threshold analysis)
- Data source freshness and quality
- Tracked follow-up actions and alerts
- Historical trend data

Guidelines:
- Be specific and data-driven. Reference actual program names, numbers, and dates.
- Prioritize actionable insights over general commentary.
- When diagnosing problems, explain the cause chain (e.g., "staffing gap → delayed installations → delivery shortfall").
- Format responses with clear structure: use short paragraphs, bullet points for lists.
- If data is insufficient, say so rather than guessing.
- Keep responses concise — 3-5 paragraphs max unless asked for detail.`;

function buildPortfolioContext(programs, dataSources, thresholds, snapshots) {
  const dashboard = buildDashboard({ programs, dataSources, thresholds, snapshots });
  const anomalies = detectProgramAnomalies(programs, dataSources, { thresholds });
  const actions = recommendActions(programs, anomalies, { thresholds, snapshots });
  const summary = summarizePortfolio(programs, { thresholds, snapshots });

  return {
    summary,
    programCount: programs.length,
    programs: programs.map(p => ({
      id: p.id,
      name: p.name,
      owner: p.owner,
      healthScore: p.kpis?.healthScore,
      healthStatus: p.kpis?.healthStatus,
      deliveryPct: p.kpis?.deliveryPct,
      staffingCapacityPct: p.metrics?.staffingCapacityPct,
      openRoles: p.metrics?.openRoles,
      complianceScore: p.metrics?.complianceScore,
      forecastStatus: p.forecast?.status,
      forecastDeliveryPct: p.forecast?.projectedDeliveryPct,
      trendDirection: p.trend?.direction
    })),
    anomalies: anomalies.slice(0, 15).map(a => ({
      programId: a.programId,
      title: a.title,
      severity: a.severity,
      category: a.category,
      currentValue: a.currentValue,
      threshold: a.threshold,
      recommendation: a.recommendation
    })),
    recommendedActions: actions.slice(0, 10).map(a => ({
      programId: a.programId,
      title: a.title,
      owner: a.owner,
      priority: a.priority,
      reason: a.reason
    })),
    degradedSources: dataSources
      .filter(s => s.status === "stale" || s.syncHealth === "failed")
      .map(s => ({ name: s.name, status: s.status, freshnessHours: s.freshnessHours, qualityScore: s.qualityScore }))
  };
}

function fallbackAnalysis(context) {
  const atRisk = context.programs.filter(p => p.healthStatus === "at-risk");
  const topAnomalies = context.anomalies.filter(a => a.severity === "high");

  const lines = [];
  lines.push(`Portfolio has ${context.programCount} programs. ${atRisk.length} are at risk.`);

  if (atRisk.length > 0) {
    lines.push(`\nPrograms needing attention: ${atRisk.map(p => `${p.name} (health: ${p.healthScore}/100)`).join(", ")}.`);
  }

  if (topAnomalies.length > 0) {
    lines.push(`\nHigh-priority issues:`);
    topAnomalies.forEach(a => {
      lines.push(`- ${a.title}: ${a.currentValue} (threshold: ${a.threshold}). ${a.recommendation}`);
    });
  }

  if (context.recommendedActions.length > 0) {
    lines.push(`\nRecommended next actions:`);
    context.recommendedActions.slice(0, 5).forEach(a => {
      lines.push(`- ${a.title} (${a.owner}): ${a.reason}`);
    });
  }

  if (context.degradedSources.length > 0) {
    lines.push(`\nData quality concerns: ${context.degradedSources.length} sources need refresh.`);
  }

  return lines.join("\n");
}

function fallbackDiagnosis(program, anomalies, actions) {
  const lines = [];
  lines.push(`${program.name} — Health: ${program.kpis?.healthStatus} (${program.kpis?.healthScore}/100)`);
  lines.push(`Delivery: ${program.kpis?.deliveryPct}% | Staffing: ${program.metrics?.staffingCapacityPct}% | Compliance: ${program.metrics?.complianceScore}`);
  lines.push(`Forecast: ${program.forecast?.projectedDeliveryPct}% (${program.forecast?.status})`);

  if (anomalies.length > 0) {
    lines.push(`\nIssues detected:`);
    anomalies.forEach(a => lines.push(`- [${a.severity}] ${a.title}: ${a.currentValue}. ${a.recommendation}`));
  }

  if (actions.length > 0) {
    lines.push(`\nRecommended actions:`);
    actions.forEach(a => lines.push(`- ${a.title} → ${a.owner}`));
  }

  lines.push(`\nTrend: ${program.trend?.direction ?? "unknown"} (${program.trend?.monthOverMonthDeliveryDelta >= 0 ? "+" : ""}${program.trend?.monthOverMonthDeliveryDelta ?? 0} points month-over-month)`);

  return lines.join("\n");
}

function fallbackAnswer(question, context) {
  const q = question.toLowerCase();

  if (q.includes("at risk") || q.includes("attention") || q.includes("worst")) {
    const atRisk = context.programs.filter(p => p.healthStatus === "at-risk");
    if (atRisk.length === 0) return "No programs are currently at risk. All programs are within healthy thresholds.";
    return `${atRisk.length} program(s) are at risk:\n${atRisk.map(p => `- ${p.name}: health ${p.healthScore}/100, delivery ${p.deliveryPct}%`).join("\n")}`;
  }

  if (q.includes("priorit") || q.includes("what should") || q.includes("next step") || q.includes("do first")) {
    if (context.recommendedActions.length === 0) return "No urgent actions needed. The portfolio is in good shape.";
    return `Top priorities:\n${context.recommendedActions.slice(0, 5).map((a, i) => `${i + 1}. ${a.title} (${a.owner}) — ${a.reason}`).join("\n")}`;
  }

  if (q.includes("delivery") || q.includes("performance")) {
    const avg = Math.round(context.programs.reduce((s, p) => s + (p.deliveryPct || 0), 0) / (context.programCount || 1));
    return `Average delivery across ${context.programCount} programs is ${avg}%. ${context.summary?.deliveryTrendDirection === "worsening" ? "Delivery is trending downward." : "Delivery trend is stable or improving."}`;
  }

  if (q.includes("data") || q.includes("source") || q.includes("stale")) {
    if (context.degradedSources.length === 0) return "All data sources are currently fresh and healthy.";
    return `${context.degradedSources.length} data sources need attention:\n${context.degradedSources.map(s => `- ${s.name}: ${s.status}, ${s.freshnessHours}h old, quality ${s.qualityScore}%`).join("\n")}`;
  }

  return fallbackAnalysis(context);
}

export class AiAgentService {
  constructor() {
    this.mode = env.openaiApiKey ? "openai" : "fallback";
    this.client = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;
  }

  async _chat(messages, options = {}) {
    if (!this.client) return null;
    try {
      const completion = await this.client.chat.completions.create({
        model: env.openaiModel,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1000,
        messages
      });
      return completion.choices[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }

  async analyzePortfolio({ programs, dataSources, thresholds, snapshots }) {
    const context = buildPortfolioContext(programs, dataSources, thresholds, snapshots);

    const aiResponse = await this._chat([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze this portfolio and provide:\n1. A 2-sentence executive summary\n2. Top 3 risks ranked by urgency\n3. Top 3 recommended actions\n4. One-sentence data quality assessment\n\nPortfolio data:\n${JSON.stringify(context)}` }
    ]);

    return {
      mode: this.mode,
      insight: aiResponse || fallbackAnalysis(context),
      context: {
        programCount: context.programCount,
        atRiskCount: context.programs.filter(p => p.healthStatus === "at-risk").length,
        highPriorityIssues: context.anomalies.filter(a => a.severity === "high").length,
        degradedSources: context.degradedSources.length
      }
    };
  }

  async askQuestion({ question, programs, dataSources, thresholds, snapshots }) {
    const context = buildPortfolioContext(programs, dataSources, thresholds, snapshots);

    const aiResponse = await this._chat([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Based on this portfolio data, answer the user's question.\n\nPortfolio:\n${JSON.stringify(context)}\n\nQuestion: ${question}` }
    ]);

    return {
      mode: this.mode,
      answer: aiResponse || fallbackAnswer(question, context)
    };
  }

  async diagnoseProgram({ program, anomalies, actions, snapshots }) {
    const enriched = enrichProgram ? program : program;
    const programAnomalies = anomalies.filter(a => a.programId === program.id);
    const programActions = actions.filter(a => a.programId === program.id);

    const aiResponse = await this._chat([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Provide a diagnostic assessment for this program. Include: current health summary, root cause analysis for any issues, specific recommended actions with owners.\n\nProgram:\n${JSON.stringify({
          ...program,
          anomalies: programAnomalies,
          recommendedActions: programActions
        })}`
      }
    ]);

    return {
      mode: this.mode,
      diagnosis: aiResponse || fallbackDiagnosis(enriched, programAnomalies, programActions)
    };
  }

  async suggestActions({ programs, dataSources, thresholds, snapshots }) {
    const context = buildPortfolioContext(programs, dataSources, thresholds, snapshots);

    const aiResponse = await this._chat([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Based on the current portfolio state, suggest 5 specific follow-up actions. For each, provide:\n- title (what to do)\n- owner (who should do it — use actual names from the data)\n- priority (1-5)\n- reason (why this matters now)\n- due (suggested timeframe like "this week", "next 2 weeks")\n\nRespond as a JSON array.\n\nPortfolio:\n${JSON.stringify(context)}`
      }
    ], { temperature: 0.4 });

    let suggestions = [];
    if (aiResponse) {
      try {
        const cleaned = aiResponse.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        suggestions = JSON.parse(cleaned);
      } catch {
        suggestions = [];
      }
    }

    if (suggestions.length === 0) {
      suggestions = context.recommendedActions.slice(0, 5).map((a, i) => ({
        title: a.title,
        owner: a.owner,
        priority: i + 1,
        reason: a.reason,
        due: "this week"
      }));
    }

    return { mode: this.mode, suggestions };
  }
}
