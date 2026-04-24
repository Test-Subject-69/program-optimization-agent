import { defaultOptimizationThresholds, normalizeOptimizationThresholds } from "./thresholds.js";

function safeNum(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((safeNum(value) + Number.EPSILON) * factor) / factor;
}

function pct(numerator, denominator) {
  const resolvedDenominator = safeNum(denominator);
  if (!resolvedDenominator) return 0;
  return round((safeNum(numerator) / resolvedDenominator) * 100);
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, safeNum(value)));
}

function sortByRecordedAt(left, right) {
  return String(left.recordedAt ?? left.periodLabel ?? "").localeCompare(String(right.recordedAt ?? right.periodLabel ?? ""));
}

function trendDirection(delta, epsilon = 1) {
  if (delta > epsilon) return "improving";
  if (delta < -epsilon) return "worsening";
  return "flat";
}

function formatSigned(value) {
  const rounded = round(value, 1);
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

function resolveThresholds(input) {
  return normalizeOptimizationThresholds(input ?? defaultOptimizationThresholds);
}

function buildHealthStatus(healthScore, thresholds) {
  if (healthScore >= thresholds.healthyScoreMinimum) return "healthy";
  if (healthScore >= thresholds.monitorScoreMinimum) return "monitor";
  return "at-risk";
}

function buildProgramSnapshotSeries(program, snapshots = []) {
  const relevant = snapshots
    .filter((snapshot) => snapshot.programId === program.id)
    .map((snapshot) => ({
      ...snapshot,
      householdsServed: safeNum(snapshot.householdsServed),
      householdsTarget: safeNum(snapshot.householdsTarget),
      deliveryPct: pct(snapshot.householdsServed, snapshot.householdsTarget),
      staffingCapacityPct: safeNum(snapshot.staffingCapacityPct),
      backlogCount: safeNum(snapshot.backlogCount),
      complianceScore: safeNum(snapshot.complianceScore),
      dataFreshnessHours: safeNum(snapshot.dataFreshnessHours)
    }))
    .sort(sortByRecordedAt);

  if (relevant.length > 0) return relevant;

  return (program.monthlyTrend ?? []).map((entry, index) => ({
    id: `${program.id}-derived-snapshot-${index + 1}`,
    programId: program.id,
    periodLabel: entry.month,
    recordedAt: `${String(index + 1).padStart(2, "0")}`,
    householdsServed: safeNum(entry.served),
    householdsTarget: safeNum(entry.target),
    deliveryPct: pct(entry.served, entry.target),
    staffingCapacityPct: safeNum(program.metrics?.staffingCapacityPct),
    backlogCount: safeNum(program.metrics?.backlogCount),
    complianceScore: safeNum(program.metrics?.complianceScore),
    dataFreshnessHours: safeNum(program.metrics?.dataFreshnessHours)
  }));
}

export function buildTrendSummary(series = []) {
  if (series.length === 0) {
    return {
      currentPeriod: null,
      previousPeriod: null,
      monthOverMonthDeliveryDelta: 0,
      direction: "flat",
      summary: "No historical KPI snapshots are available yet."
    };
  }

  const current = series.at(-1);
  const previous = series.at(-2) ?? null;
  const delta = previous ? round(current.deliveryPct - previous.deliveryPct, 1) : 0;
  const direction = previous ? trendDirection(delta) : "flat";
  const summary = previous
    ? `Delivery moved ${formatSigned(delta)} points month over month and is currently ${direction}.`
    : "Only one historical snapshot is available so trend direction is not established yet.";

  return {
    currentPeriod: current.periodLabel ?? current.recordedAt ?? null,
    previousPeriod: previous?.periodLabel ?? previous?.recordedAt ?? null,
    monthOverMonthDeliveryDelta: delta,
    direction,
    summary
  };
}

export function forecastProgramTargetAttainment(program, snapshots = [], thresholds = defaultOptimizationThresholds) {
  const resolvedThresholds = resolveThresholds(thresholds);
  const series = Array.isArray(snapshots) ? snapshots : buildProgramSnapshotSeries(program, []);
  const latestSnapshots = series.slice(-3);
  const monthToMonthDeltas = latestSnapshots
    .slice(1)
    .map((entry, index) => safeNum(entry.householdsServed) - safeNum(latestSnapshots[index].householdsServed));
  const averageDelta =
    monthToMonthDeltas.length > 0
      ? monthToMonthDeltas.reduce((sum, value) => sum + value, 0) / monthToMonthDeltas.length
      : 0;

  const latestVolume = safeNum(latestSnapshots.at(-1)?.householdsServed);
  const projectedNextMonthVolume = Math.max(0, round(latestVolume + averageDelta));
  const remainingMonths = Math.max(1, 6 - series.length);
  const projectedServed = Math.max(
    safeNum(program.metrics?.householdsServed),
    round(safeNum(program.metrics?.householdsServed) + projectedNextMonthVolume * remainingMonths)
  );
  const projectedDeliveryPct = pct(projectedServed, program.metrics?.householdsTarget);
  const status =
    projectedDeliveryPct >= 100
      ? "on-track"
      : projectedDeliveryPct >= resolvedThresholds.deliveryWarningPct
        ? "watch"
        : "off-track";

  return {
    projectedServed,
    projectedDeliveryPct,
    projectedNextMonthVolume,
    remainingMonths,
    status,
    summary:
      status === "on-track"
        ? `Current pace projects to ${projectedDeliveryPct}% of target by the next review window.`
        : status === "watch"
          ? `Current pace projects to ${projectedDeliveryPct}% of target. The program is close, but still needs active follow-up.`
          : `Current pace projects to ${projectedDeliveryPct}% of target, which is below the configured delivery threshold.`
  };
}

export function calculateProgramKpis(program, thresholds = defaultOptimizationThresholds) {
  const resolvedThresholds = resolveThresholds(thresholds);
  const metrics = program.metrics ?? {};
  const deliveryPct = pct(metrics.householdsServed ?? 0, metrics.householdsTarget ?? 0);
  const budgetVariancePct = pct((metrics.budgetYtd ?? 0) - (metrics.revenueYtd ?? 0), metrics.revenueYtd ?? 1);
  const capacityRisk = clamp(100 - safeNum(metrics.staffingCapacityPct, 100) + safeNum(metrics.openRoles) * 1.5);
  const scheduleRisk = clamp(100 - safeNum(metrics.scheduleAdherencePct, 100));
  const complianceRisk = clamp(100 - safeNum(metrics.complianceScore, 100));
  const dataRisk = clamp(
    safeNum(metrics.dataFreshnessHours) > resolvedThresholds.dataFreshnessWarningHours
      ? 24
      : safeNum(metrics.dataFreshnessHours) / 2
  );
  const equityDelta = round(safeNum(metrics.equityReachPct) - safeNum(metrics.equityTargetPct));
  const healthScore = clamp(
    100 -
      (100 - deliveryPct) * 0.28 -
      capacityRisk * 0.22 -
      scheduleRisk * 0.18 -
      Math.max(0, -equityDelta) * 1.6 -
      complianceRisk * 0.18 -
      dataRisk * 0.14
  );

  return {
    deliveryPct,
    budgetVariancePct,
    capacityRisk: round(capacityRisk),
    scheduleRisk: round(scheduleRisk),
    complianceRisk: round(complianceRisk),
    dataRisk: round(dataRisk),
    equityDelta,
    healthScore: round(healthScore),
    healthStatus: buildHealthStatus(healthScore, resolvedThresholds)
  };
}

export function enrichProgram(program, options = {}) {
  const thresholds = resolveThresholds(options.thresholds);
  const snapshots = buildProgramSnapshotSeries(program, options.snapshots ?? []);
  return {
    ...program,
    kpis: calculateProgramKpis(program, thresholds),
    trend: buildTrendSummary(snapshots),
    forecast: forecastProgramTargetAttainment(program, snapshots, thresholds),
    snapshotCount: snapshots.length
  };
}

export function buildPortfolioSnapshotSeries(programs, snapshots = []) {
  const grouped = new Map();
  for (const snapshot of snapshots.slice().sort(sortByRecordedAt)) {
    const key = snapshot.periodLabel ?? snapshot.recordedAt;
    if (!grouped.has(key)) {
      grouped.set(key, {
        periodLabel: key,
        recordedAt: snapshot.recordedAt,
        householdsServed: 0,
        householdsTarget: 0
      });
    }
    const entry = grouped.get(key);
    entry.householdsServed += safeNum(snapshot.householdsServed);
    entry.householdsTarget += safeNum(snapshot.householdsTarget);
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      deliveryPct: pct(entry.householdsServed, entry.householdsTarget)
    }))
    .sort(sortByRecordedAt);
}

export function summarizePortfolio(programs, options = {}) {
  const thresholds = resolveThresholds(options.thresholds);
  const enriched = programs.map((program) =>
    enrichProgram(program, {
      thresholds,
      snapshots: (options.snapshots ?? []).filter((snapshot) => snapshot.programId === program.id)
    })
  );
  const totals = enriched.reduce(
    (acc, program) => {
      const metrics = program.metrics ?? {};
      acc.contractValue += safeNum(program.contractValue);
      acc.revenueYtd += safeNum(metrics.revenueYtd);
      acc.budgetYtd += safeNum(metrics.budgetYtd);
      acc.householdsServed += safeNum(metrics.householdsServed);
      acc.householdsTarget += safeNum(metrics.householdsTarget);
      acc.equityReachWeighted += safeNum(metrics.equityReachPct) * safeNum(metrics.householdsServed);
      acc.equityWeight += safeNum(metrics.householdsServed);
      acc.healthScore += program.kpis.healthScore;
      acc.openRoles += safeNum(metrics.openRoles);
      acc.backlogCount += safeNum(metrics.backlogCount);
      if (program.kpis.healthStatus === "at-risk") acc.atRisk += 1;
      if (program.kpis.healthStatus === "monitor") acc.monitor += 1;
      if (safeNum(metrics.complianceScore, 100) < thresholds.complianceMinimumScore) acc.complianceAtRisk += 1;
      if (program.forecast.status === "on-track") acc.onTrack += 1;
      if (program.forecast.status === "off-track") acc.offTrack += 1;
      return acc;
    },
    {
      contractValue: 0,
      revenueYtd: 0,
      budgetYtd: 0,
      householdsServed: 0,
      householdsTarget: 0,
      equityReachWeighted: 0,
      equityWeight: 0,
      healthScore: 0,
      openRoles: 0,
      backlogCount: 0,
      atRisk: 0,
      monitor: 0,
      complianceAtRisk: 0,
      onTrack: 0,
      offTrack: 0
    }
  );

  const portfolioSeries = buildPortfolioSnapshotSeries(programs, options.snapshots ?? []);
  const portfolioTrend = buildTrendSummary(portfolioSeries);
  const averageForecast =
    enriched.length > 0
      ? round(enriched.reduce((sum, program) => sum + safeNum(program.forecast.projectedDeliveryPct), 0) / enriched.length)
      : 0;

  return {
    programCount: enriched.length,
    activeProgramCount: enriched.filter((program) => program.status === "active").length,
    contractValue: totals.contractValue,
    revenueYtd: totals.revenueYtd,
    budgetYtd: totals.budgetYtd,
    marginValue: totals.revenueYtd - totals.budgetYtd,
    deliveryPct: pct(totals.householdsServed, totals.householdsTarget),
    householdsServed: totals.householdsServed,
    householdsTarget: totals.householdsTarget,
    averageHealthScore: enriched.length ? round(totals.healthScore / enriched.length) : 0,
    atRiskProgramCount: totals.atRisk,
    monitorProgramCount: totals.monitor,
    openRoles: totals.openRoles,
    backlogCount: totals.backlogCount,
    complianceAtRisk: totals.complianceAtRisk,
    equityReachPct: totals.equityWeight ? round(totals.equityReachWeighted / totals.equityWeight) : 0,
    monthOverMonthDeliveryDelta: portfolioTrend.monthOverMonthDeliveryDelta,
    deliveryTrendDirection: portfolioTrend.direction,
    forecastDeliveryPct: averageForecast,
    forecastStatus: averageForecast >= 100 ? "on-track" : averageForecast >= thresholds.deliveryWarningPct ? "watch" : "off-track",
    forecastOnTrackCount: totals.onTrack,
    forecastAtRiskCount: totals.offTrack
  };
}

export function detectProgramAnomalies(programs, dataSources = [], options = {}) {
  const thresholds = resolveThresholds(options.thresholds);
  const anomalies = [];

  for (const program of programs.map((entry) =>
    enrichProgram(entry, {
      thresholds,
      snapshots: (options.snapshots ?? []).filter((snapshot) => snapshot.programId === entry.id)
    })
  )) {
    const metrics = program.metrics ?? {};
    if (program.kpis.deliveryPct < thresholds.deliveryWarningPct) {
      anomalies.push({
        id: `${program.id}-delivery`,
        programId: program.id,
        severity: program.kpis.deliveryPct < thresholds.deliveryCriticalPct ? "high" : "medium",
        category: "Delivery",
        title: "Delivery is behind target",
        currentValue: `${program.kpis.deliveryPct}%`,
        threshold: `${thresholds.deliveryWarningPct}%`,
        recommendation: "Review field capacity, partner handoffs, and appointment backlog this week."
      });
    }

    if (
      safeNum(metrics.staffingCapacityPct, 100) < thresholds.staffingTargetPct ||
      safeNum(metrics.openRoles) >= thresholds.openRolesWarning
    ) {
      anomalies.push({
        id: `${program.id}-capacity`,
        programId: program.id,
        severity: safeNum(metrics.staffingCapacityPct, 100) < thresholds.staffingCriticalPct ? "high" : "medium",
        category: "Capacity",
        title: "Capacity is constraining delivery",
        currentValue: `${metrics.staffingCapacityPct}% staffed, ${metrics.openRoles} open roles`,
        threshold: `${thresholds.staffingTargetPct}% staffed`,
        recommendation: "Escalate recruiting, subcontractor coverage, or schedule sequencing before backlog grows."
      });
    }

    if (program.kpis.equityDelta < -thresholds.equityGapWarningPct) {
      anomalies.push({
        id: `${program.id}-equity`,
        programId: program.id,
        severity: "medium",
        category: "Equity",
        title: "Equity reach is below target",
        currentValue: `${metrics.equityReachPct}%`,
        threshold: `${metrics.equityTargetPct}%`,
        recommendation: "Tune outreach channels and community partner coverage for underserved households."
      });
    }

    if (safeNum(metrics.complianceScore, 100) < thresholds.complianceMinimumScore) {
      anomalies.push({
        id: `${program.id}-compliance`,
        programId: program.id,
        severity: "high",
        category: "Compliance",
        title: "Compliance score requires attention",
        currentValue: `${metrics.complianceScore}`,
        threshold: `${thresholds.complianceMinimumScore}`,
        recommendation: "Prioritize file completeness, evidence collection, and audit-readiness review."
      });
    }
  }

  for (const source of dataSources) {
    if (
      source.status !== "fresh" ||
      safeNum(source.freshnessHours) > thresholds.dataFreshnessWarningHours ||
      safeNum(source.qualityScore) < thresholds.dataQualityMinimumPct
    ) {
      anomalies.push({
        id: `${source.id}-data`,
        programId: source.programIds?.[0] ?? null,
        severity:
          safeNum(source.freshnessHours) > thresholds.dataFreshnessWarningHours ||
          safeNum(source.qualityScore) < thresholds.dataQualityCriticalPct
            ? "high"
            : "medium",
        category: "Data",
        title: `${source.name} needs data stewardship`,
        currentValue: `${source.freshnessHours}h old, ${source.qualityScore}% quality`,
        threshold: `${thresholds.dataFreshnessWarningHours}h freshness, ${thresholds.dataQualityMinimumPct}% quality`,
        recommendation: "Refresh the source and resolve missing or inconsistent program fields."
      });
    }
  }

  return anomalies.sort((left, right) => {
    const severityRank = { high: 0, medium: 1, low: 2 };
    return severityRank[left.severity] - severityRank[right.severity] || left.category.localeCompare(right.category);
  });
}

export function recommendActions(programs, anomalies, options = {}) {
  const thresholds = resolveThresholds(options.thresholds);
  const byProgram = new Map(
    programs.map((program) => [
      program.id,
      enrichProgram(program, {
        thresholds,
        snapshots: (options.snapshots ?? []).filter((snapshot) => snapshot.programId === program.id)
      })
    ])
  );
  const highAnomalies = anomalies.filter((anomaly) => anomaly.severity === "high");
  const actions = highAnomalies.slice(0, 5).map((anomaly, index) => {
    const program = byProgram.get(anomaly.programId);
    return {
      id: `action-${index + 1}`,
      programId: anomaly.programId,
      owner: program?.executiveSponsor ?? "Executive team",
      priority: index + 1,
      title: anomaly.recommendation,
      reason: `${program?.name ?? "Shared data source"}: ${anomaly.title}`,
      due: "This week"
    };
  });

  if (actions.length < 3) {
    actions.push({
      id: "action-portfolio-review",
      programId: null,
      owner: "Executive team",
      priority: actions.length + 1,
      title: "Use the weekly brief to confirm which programs need capacity or partner escalation.",
      reason: "Maintains leadership visibility across rapid growth and multi-partner delivery.",
      due: "Weekly"
    });
  }

  return actions;
}

export function buildDashboard({ programs, dataSources, thresholds, snapshots = [] }) {
  const resolvedThresholds = resolveThresholds(thresholds);
  const enrichedPrograms = programs.map((program) =>
    enrichProgram(program, {
      thresholds: resolvedThresholds,
      snapshots: snapshots.filter((snapshot) => snapshot.programId === program.id)
    })
  );
  const anomalies = detectProgramAnomalies(programs, dataSources, {
    thresholds: resolvedThresholds,
    snapshots
  });
  return {
    summary: summarizePortfolio(programs, { thresholds: resolvedThresholds, snapshots }),
    programs: enrichedPrograms,
    dataSources,
    anomalies,
    actions: recommendActions(programs, anomalies, { thresholds: resolvedThresholds, snapshots }),
    thresholds: resolvedThresholds,
    portfolioTrend: buildTrendSummary(buildPortfolioSnapshotSeries(programs, snapshots))
  };
}

export function buildReportInput({ programs, dataSources, thresholds, snapshots = [] }) {
  const dashboard = buildDashboard({ programs, dataSources, thresholds, snapshots });
  return {
    generatedAt: new Date().toISOString(),
    summary: dashboard.summary,
    topRisks: dashboard.anomalies.slice(0, 5),
    topActions: dashboard.actions.slice(0, 5),
    portfolioTrend: dashboard.portfolioTrend,
    thresholds: dashboard.thresholds,
    programHighlights: dashboard.programs.map((program) => ({
      id: program.id,
      name: program.name,
      partner: program.utilityPartner,
      state: program.state,
      healthScore: program.kpis.healthScore,
      healthStatus: program.kpis.healthStatus,
      deliveryPct: program.kpis.deliveryPct,
      capacityRisk: program.kpis.capacityRisk,
      equityDelta: program.kpis.equityDelta,
      trendDirection: program.trend.direction,
      projectedDeliveryPct: program.forecast.projectedDeliveryPct,
      forecastStatus: program.forecast.status
    }))
  };
}
