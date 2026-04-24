export const defaultOptimizationThresholds = Object.freeze({
  deliveryWarningPct: 85,
  deliveryCriticalPct: 78,
  staffingTargetPct: 82,
  staffingCriticalPct: 72,
  openRolesWarning: 10,
  equityGapWarningPct: 5,
  complianceMinimumScore: 90,
  dataFreshnessWarningHours: 48,
  dataQualityMinimumPct: 90,
  dataQualityCriticalPct: 85,
  healthyScoreMinimum: 85,
  monitorScoreMinimum: 72
});

export function normalizeOptimizationThresholds(input = {}) {
  return {
    ...defaultOptimizationThresholds,
    ...Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== "")
    )
  };
}
