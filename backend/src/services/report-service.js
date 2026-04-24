import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { buildReportInput, validateReportInput } from "@program-optimization/shared";

import { env } from "../config/env.js";

function fallbackSummary(reportInput) {
  const topRisk = reportInput.topRisks[0];
  const topAction = reportInput.topActions[0];
  return [
    `Portfolio health is ${reportInput.summary.averageHealthScore}/100 across ${reportInput.summary.programCount} Walker-Miller program lines.`,
    `Delivery is at ${reportInput.summary.deliveryPct}% of target with ${reportInput.summary.openRoles} open roles, ${reportInput.summary.backlogCount} backlog items, and a ${reportInput.summary.deliveryTrendDirection} month-over-month trend.`,
    topRisk ? `Primary risk: ${topRisk.title} (${topRisk.currentValue}; threshold ${topRisk.threshold}).` : "No high-priority anomalies are currently detected.",
    topAction ? `Recommended next action: ${topAction.title}` : "Recommended next action: keep weekly executive review cadence.",
    `Portfolio forecast status is ${reportInput.summary.forecastStatus} at ${reportInput.summary.forecastDeliveryPct}% of target if current pace continues.`
  ].join("\n");
}

export class ReportService {
  constructor() {
    this.mode = env.openaiApiKey ? "openai" : "fallback";
    this.client = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;
  }

  async generateExecutiveBrief({ programs, dataSources, input = {}, thresholds = {}, snapshots = [] }) {
    const validated = validateReportInput(input);
    const reportInput = buildReportInput({ programs, dataSources, thresholds, snapshots });
    let summary = fallbackSummary(reportInput);

    if (this.client) {
      try {
        const completion = await this.client.chat.completions.create({
          model: env.openaiModel,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You write concise executive program performance briefs for a clean-energy services company. Be practical, specific, and action-oriented."
            },
            {
              role: "user",
              content: [
                `Audience: ${validated.audience}`,
                `Focus: ${validated.focus}`,
                "Write a brief with 4 short paragraphs: portfolio readout, risks, capacity constraints, and next actions.",
                JSON.stringify(reportInput)
              ].join("\n")
            }
          ]
        });
        summary = completion.choices[0]?.message?.content?.trim() || summary;
      } catch {
        summary = fallbackSummary(reportInput);
      }
    }

    return {
      id: randomUUID(),
      title: "Walker-Miller Executive Program Brief",
      focus: validated.focus,
      audience: validated.audience,
      mode: this.mode,
      summary,
      risks: reportInput.topRisks,
      actions: validated.includeActions ? reportInput.topActions : [],
      createdAt: new Date().toISOString()
    };
  }
}
