export {
  sampleAlerts,
  sampleAuditEvents,
  sampleDataSources,
  sampleKpiSnapshots,
  sampleOptimizationConfig,
  samplePrograms,
  sampleReportTemplates,
  sampleSyncRuns,
  sampleTrackedActions
} from "./sample-data.js";
export { deriveDataSourceStatus, normalizeDataSourceImport, normalizeProgramImport } from "./imports.js";
export {
  buildDashboard,
  buildPortfolioSnapshotSeries,
  buildReportInput,
  buildTrendSummary,
  calculateProgramKpis,
  detectProgramAnomalies,
  enrichProgram,
  forecastProgramTargetAttainment,
  recommendActions,
  summarizePortfolio
} from "./optimization.js";
export {
  assertRequired,
  validateAlertInput,
  validateImportPayload,
  validateOptimizationThresholdsInput,
  validateProgramId,
  validateProgramUpdateInput,
  validateReportInput,
  validateReportTemplateInput,
  validateTrackedActionInput
} from "./validation.js";
export { defaultOptimizationThresholds, normalizeOptimizationThresholds } from "./thresholds.js";
