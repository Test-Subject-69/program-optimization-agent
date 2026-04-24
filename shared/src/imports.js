function firstDefined(object, keys, fallback = undefined) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object?.[key] !== null) return object[key];
  }
  return fallback;
}

function asString(value, fallback = "") {
  const normalized = value === undefined || value === null ? fallback : String(value).trim();
  return normalized || fallback;
}

function asNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function asInteger(value, fallback = 0) {
  return Math.round(asNumber(value, fallback));
}

function slugify(value, fallback = "imported-record") {
  const normalized = asString(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function normalizeMetrics(metrics = {}) {
  return {
    householdsServed: asInteger(firstDefined(metrics, ["householdsServed", "households_served"], 0)),
    householdsTarget: asInteger(firstDefined(metrics, ["householdsTarget", "households_target"], 0)),
    revenueYtd: asNumber(firstDefined(metrics, ["revenueYtd", "revenue_ytd"], 0)),
    budgetYtd: asNumber(firstDefined(metrics, ["budgetYtd", "budget_ytd"], 0)),
    grossMarginPct: asNumber(firstDefined(metrics, ["grossMarginPct", "gross_margin_pct"], 0)),
    equityReachPct: asNumber(firstDefined(metrics, ["equityReachPct", "equity_reach_pct"], 0)),
    equityTargetPct: asNumber(firstDefined(metrics, ["equityTargetPct", "equity_target_pct"], 0)),
    scheduleAdherencePct: asNumber(firstDefined(metrics, ["scheduleAdherencePct", "schedule_adherence_pct"], 100)),
    staffingCapacityPct: asNumber(firstDefined(metrics, ["staffingCapacityPct", "staffing_capacity_pct"], 100)),
    backlogCount: asInteger(firstDefined(metrics, ["backlogCount", "backlog_count"], 0)),
    openRoles: asInteger(firstDefined(metrics, ["openRoles", "open_roles"], 0)),
    complianceScore: asNumber(firstDefined(metrics, ["complianceScore", "compliance_score"], 100)),
    customerSatisfaction: asNumber(firstDefined(metrics, ["customerSatisfaction", "customer_satisfaction"], 0)),
    avgCycleDays: asNumber(firstDefined(metrics, ["avgCycleDays", "avg_cycle_days"], 0)),
    dataFreshnessHours: asNumber(firstDefined(metrics, ["dataFreshnessHours", "data_freshness_hours"], 0))
  };
}

function normalizeMonthlyTrend(monthlyTrend = []) {
  if (!Array.isArray(monthlyTrend)) return [];
  return monthlyTrend.map((entry, index) => ({
    month: asString(firstDefined(entry, ["month"], `P${index + 1}`), `P${index + 1}`),
    served: asInteger(firstDefined(entry, ["served"], 0)),
    target: asInteger(firstDefined(entry, ["target"], 0))
  }));
}

export function deriveDataSourceStatus({ status = "", freshnessHours = 0, qualityScore = 100 } = {}) {
  const normalizedStatus = asString(status).toLowerCase();
  if (normalizedStatus) return normalizedStatus;
  if (qualityScore < 80) return "failed";
  if (freshnessHours > 24 || qualityScore < 90) return "stale";
  return "fresh";
}

export function normalizeProgramImport(program = {}, index = 0) {
  const name = asString(firstDefined(program, ["name"]), `Imported program ${index + 1}`);
  const metrics = normalizeMetrics(program.metrics ?? program);
  return {
    id: asString(firstDefined(program, ["id"]), slugify(name, `imported-program-${index + 1}`)),
    name,
    programType: asString(firstDefined(program, ["programType", "program_type"]), "Imported program"),
    utilityPartner: asString(firstDefined(program, ["utilityPartner", "utility_partner"]), "Imported partner"),
    state: asString(firstDefined(program, ["state"]), "Unknown"),
    owner: asString(firstDefined(program, ["owner"]), "Program Operations"),
    executiveSponsor: asString(firstDefined(program, ["executiveSponsor", "executive_sponsor"]), "Executive team"),
    status: asString(firstDefined(program, ["status"]), "active").toLowerCase(),
    contractValue: asNumber(firstDefined(program, ["contractValue", "contract_value"], 0)),
    period: asString(firstDefined(program, ["period"]), "Current"),
    objective: asString(firstDefined(program, ["objective"]), "Imported program record."),
    targetAudience: asString(firstDefined(program, ["targetAudience", "target_audience"]), "Program participants"),
    metrics,
    monthlyTrend: normalizeMonthlyTrend(firstDefined(program, ["monthlyTrend", "monthly_trend"], []))
  };
}

export function normalizeDataSourceImport(dataSource = {}, programIds = [], importedAt = new Date().toISOString()) {
  const name = asString(firstDefined(dataSource, ["name"]), "Imported data source");
  const freshnessHours = asNumber(firstDefined(dataSource, ["freshnessHours", "freshness_hours"], 0));
  const qualityScore = asNumber(firstDefined(dataSource, ["qualityScore", "quality_score"], 100));
  const status = deriveDataSourceStatus({
    status: firstDefined(dataSource, ["status"]),
    freshnessHours,
    qualityScore
  });

  return {
    id: asString(firstDefined(dataSource, ["id"]), slugify(name, "imported-data-source")),
    name,
    sourceType: asString(firstDefined(dataSource, ["sourceType", "source_type"]), "Imported feed"),
    owner: asString(firstDefined(dataSource, ["owner"]), "Operations"),
    status,
    lastSyncAt: asString(firstDefined(dataSource, ["lastSyncAt", "last_sync_at"]), importedAt),
    freshnessHours,
    records: asInteger(firstDefined(dataSource, ["records"]), programIds.length),
    qualityScore,
    programIds: Array.from(new Set(programIds.filter(Boolean)))
  };
}
