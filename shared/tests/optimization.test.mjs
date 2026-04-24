import assert from "node:assert/strict";
import {
  buildDashboard,
  buildPortfolioSnapshotSeries,
  buildReportInput,
  buildTrendSummary,
  calculateProgramKpis,
  detectProgramAnomalies,
  sampleDataSources,
  sampleKpiSnapshots,
  samplePrograms,
  summarizePortfolio
} from "../src/index.js";

const dte = samplePrograms.find((program) => program.id === "dte-multifamily-efficiency");
const comed = samplePrograms.find((program) => program.id === "comed-beneficial-electrification");

const dteKpis = calculateProgramKpis(dte);
const comedKpis = calculateProgramKpis(comed);
const summary = summarizePortfolio(samplePrograms, { snapshots: sampleKpiSnapshots });
const anomalies = detectProgramAnomalies(samplePrograms, sampleDataSources, { snapshots: sampleKpiSnapshots });
const dashboard = buildDashboard({ programs: samplePrograms, dataSources: sampleDataSources, snapshots: sampleKpiSnapshots });
const reportInput = buildReportInput({ programs: samplePrograms, dataSources: sampleDataSources, snapshots: sampleKpiSnapshots });
const portfolioSeries = buildPortfolioSnapshotSeries(samplePrograms, sampleKpiSnapshots);
const portfolioTrend = buildTrendSummary(portfolioSeries);

assert.equal(dteKpis.deliveryPct, 84);
assert.equal(comedKpis.healthStatus, "at-risk");
assert.equal(summary.programCount, 6);
assert.equal(summary.deliveryPct > 80, true);
assert.equal(summary.atRiskProgramCount >= 1, true);
assert.equal(typeof summary.forecastDeliveryPct, "number");
assert.equal(anomalies.some((anomaly) => anomaly.category === "Capacity"), true);
assert.equal(anomalies.some((anomaly) => anomaly.category === "Data"), true);
assert.equal(dashboard.actions.length >= 3, true);
assert.equal(Array.isArray(dashboard.programs), true);
assert.equal(typeof dashboard.programs[0].forecast.projectedDeliveryPct, "number");
assert.equal(reportInput.topRisks.length > 0, true);
assert.equal(reportInput.programHighlights.length, samplePrograms.length);
assert.equal(portfolioSeries.length > 0, true);
assert.equal(["improving", "worsening", "flat"].includes(portfolioTrend.direction), true);

console.log("shared optimization tests passed");
