export function assertRequired(value, label) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`${label} is required`);
  }
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, "");
}

const VALID_SEVERITIES = new Set(["high", "medium", "low"]);

const PROGRAM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/;

export function validateProgramId(id) {
  if (typeof id !== "string" || !PROGRAM_ID_PATTERN.test(id)) {
    throw new Error("Program ID must be lowercase alphanumeric with hyphens, 2-100 characters");
  }
}

function collectValidationErrors(checks) {
  const errors = [];
  for (const check of checks) {
    try {
      check();
    } catch (error) {
      errors.push(error.message);
    }
  }
  return errors;
}

function throwValidationErrors(errors, message = "Validation failed") {
  if (errors.length === 0) return;
  const error = new Error(`${message}: ${errors.join("; ")}`);
  error.statusCode = 400;
  error.validationErrors = errors;
  throw error;
}

export function validateReportInput(input = {}) {
  const focus = String(input.focus ?? "executive-weekly").trim();
  const audience = String(input.audience ?? "Executive leadership").trim();
  const errors = collectValidationErrors([() => assertRequired(audience, "audience")]);
  throwValidationErrors(errors, "Report validation failed");

  return {
    focus,
    audience,
    includeActions: input.includeActions !== false
  };
}

function sanitizeText(value, fallback = "") {
  return stripHtml(String(value ?? fallback)).trim();
}

function parseFiniteNumber(value, label, { min = null, max = null } = {}) {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${label} must be a number`);
  }
  if (min !== null && numeric < min) {
    throw new Error(`${label} must be at least ${min}`);
  }
  if (max !== null && numeric > max) {
    throw new Error(`${label} must be at most ${max}`);
  }
  return numeric;
}

export function validateTrackedActionInput(input = {}) {
  const errors = collectValidationErrors([
    () => assertRequired(input.title, "title"),
    () => assertRequired(input.owner, "owner"),
    () => {
      if (input.due && /^\d{4}-\d{2}-\d{2}/.test(String(input.due))) {
        const dueDate = new Date(String(input.due));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDate < today) throw new Error("due date cannot be in the past");
      }
    }
  ]);
  throwValidationErrors(errors, "Tracked action validation failed");

  return {
    id: input.id ? String(input.id).trim() : "",
    programId: input.programId ? String(input.programId).trim() : null,
    alertId: input.alertId ? String(input.alertId).trim() : null,
    title: stripHtml(String(input.title)).trim(),
    reason: stripHtml(String(input.reason ?? "")).trim(),
    owner: stripHtml(String(input.owner)).trim(),
    due: String(input.due ?? "This week").trim(),
    status: String(input.status ?? "open").trim().toLowerCase(),
    priority: Number.isFinite(Number(input.priority)) ? Number(input.priority) : 0,
    completionNotes: stripHtml(String(input.completionNotes ?? "")).trim()
  };
}

export function validateProgramUpdateInput(input = {}) {
  const errors = collectValidationErrors([
    () => {
      if ("name" in input) assertRequired(input.name, "name");
    },
    () => {
      if ("owner" in input) assertRequired(input.owner, "owner");
    },
    () => {
      if ("executiveSponsor" in input || "executive_sponsor" in input) {
        assertRequired(input.executiveSponsor ?? input.executive_sponsor, "executiveSponsor");
      }
    }
  ]);
  throwValidationErrors(errors, "Program update validation failed");

  const metricsInput = input.metrics && typeof input.metrics === "object" ? input.metrics : {};
  const metrics = {};
  const metricRules = {
    householdsServed: { min: 0 },
    householdsTarget: { min: 0 },
    revenueYtd: { min: 0 },
    budgetYtd: { min: 0 },
    grossMarginPct: { min: -100, max: 100 },
    equityReachPct: { min: 0, max: 100 },
    equityTargetPct: { min: 0, max: 100 },
    scheduleAdherencePct: { min: 0, max: 100 },
    staffingCapacityPct: { min: 0, max: 100 },
    backlogCount: { min: 0 },
    openRoles: { min: 0 },
    complianceScore: { min: 0, max: 100 },
    customerSatisfaction: { min: 0, max: 5 },
    avgCycleDays: { min: 0 },
    dataFreshnessHours: { min: 0 }
  };

  for (const [key, rule] of Object.entries(metricRules)) {
    const parsed = parseFiniteNumber(metricsInput[key], `metrics.${key}`, rule);
    if (parsed !== undefined) metrics[key] = parsed;
  }

  return {
    id: input.id ? String(input.id).trim() : "",
    name: "name" in input ? sanitizeText(input.name) : undefined,
    programType: "programType" in input ? sanitizeText(input.programType) : undefined,
    utilityPartner: "utilityPartner" in input ? sanitizeText(input.utilityPartner) : undefined,
    state: "state" in input ? sanitizeText(input.state) : undefined,
    owner: "owner" in input ? sanitizeText(input.owner) : undefined,
    executiveSponsor: "executiveSponsor" in input ? sanitizeText(input.executiveSponsor) : undefined,
    status: "status" in input ? sanitizeText(input.status).toLowerCase() : undefined,
    contractValue: parseFiniteNumber(input.contractValue, "contractValue", { min: 0 }),
    period: "period" in input ? sanitizeText(input.period) : undefined,
    objective: "objective" in input ? sanitizeText(input.objective) : undefined,
    targetAudience: "targetAudience" in input ? sanitizeText(input.targetAudience) : undefined,
    metrics
  };
}

export function validateAlertInput(input = {}) {
  const severity = String(input.severity ?? "medium").trim().toLowerCase();
  const errors = collectValidationErrors([
    () => assertRequired(input.title, "title"),
    () => assertRequired(input.category, "category"),
    () => {
      if (!VALID_SEVERITIES.has(severity)) {
        throw new Error(`severity must be one of: ${[...VALID_SEVERITIES].join(", ")}`);
      }
    }
  ]);
  throwValidationErrors(errors, "Alert validation failed");

  return {
    id: input.id ? String(input.id).trim() : "",
    programId: input.programId ? String(input.programId).trim() : null,
    severity,
    category: stripHtml(String(input.category)).trim(),
    title: stripHtml(String(input.title)).trim(),
    detail: stripHtml(String(input.detail ?? "")).trim(),
    status: String(input.status ?? "open").trim().toLowerCase(),
    source: String(input.source ?? "system").trim().toLowerCase()
  };
}

export function validateReportTemplateInput(input = {}) {
  const normalized = validateReportInput(input);
  const errors = collectValidationErrors([() => assertRequired(input.name, "name")]);
  throwValidationErrors(errors, "Report template validation failed");

  return {
    id: input.id ? String(input.id).trim() : "",
    name: String(input.name).trim(),
    focus: normalized.focus,
    audience: normalized.audience,
    includeActions: normalized.includeActions
  };
}

export function validateOptimizationThresholdsInput(input = {}) {
  const rules = {
    deliveryWarningPct: { min: 0, max: 100 },
    deliveryCriticalPct: { min: 0, max: 100 },
    staffingTargetPct: { min: 0, max: 100 },
    staffingCriticalPct: { min: 0, max: 100 },
    openRolesWarning: { min: 0, max: 999 },
    equityGapWarningPct: { min: 0, max: 100 },
    complianceMinimumScore: { min: 0, max: 100 },
    dataFreshnessWarningHours: { min: 0, max: 9999 },
    dataQualityMinimumPct: { min: 0, max: 100 },
    dataQualityCriticalPct: { min: 0, max: 100 },
    healthyScoreMinimum: { min: 0, max: 100 },
    monitorScoreMinimum: { min: 0, max: 100 }
  };

  const errors = [];
  const normalized = {};

  for (const [key, rule] of Object.entries(rules)) {
    try {
      const parsed = parseFiniteNumber(input[key], key, rule);
      if (parsed !== undefined) normalized[key] = parsed;
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (
    normalized.deliveryCriticalPct !== undefined &&
    normalized.deliveryWarningPct !== undefined &&
    normalized.deliveryCriticalPct > normalized.deliveryWarningPct
  ) {
    errors.push("deliveryCriticalPct must be less than or equal to deliveryWarningPct");
  }

  if (
    normalized.staffingCriticalPct !== undefined &&
    normalized.staffingTargetPct !== undefined &&
    normalized.staffingCriticalPct > normalized.staffingTargetPct
  ) {
    errors.push("staffingCriticalPct must be less than or equal to staffingTargetPct");
  }

  if (
    normalized.monitorScoreMinimum !== undefined &&
    normalized.healthyScoreMinimum !== undefined &&
    normalized.monitorScoreMinimum > normalized.healthyScoreMinimum
  ) {
    errors.push("monitorScoreMinimum must be less than or equal to healthyScoreMinimum");
  }

  throwValidationErrors(errors, "Threshold validation failed");
  return normalized;
}

export function validateImportPayload(input = {}) {
  const dataSource = input?.dataSource;
  const programs = input?.programs;
  const errors = collectValidationErrors([
    () => assertRequired(dataSource, "dataSource"),
    () => assertRequired(dataSource?.name, "dataSource.name"),
    () => assertRequired(dataSource?.sourceType ?? dataSource?.source_type, "dataSource.sourceType"),
    () => assertRequired(dataSource?.owner, "dataSource.owner")
  ]);

  if (!Array.isArray(programs) || programs.length === 0) {
    errors.push("programs must contain at least one program");
  } else {
    programs.forEach((program, index) => {
      errors.push(
        ...collectValidationErrors([
          () => assertRequired(program?.name, `programs[${index}].name`),
          () => assertRequired(program?.programType ?? program?.program_type, `programs[${index}].programType`),
          () => assertRequired(program?.utilityPartner ?? program?.utility_partner, `programs[${index}].utilityPartner`),
          () => assertRequired(program?.state, `programs[${index}].state`),
          () => assertRequired(program?.owner, `programs[${index}].owner`),
          () => assertRequired(program?.executiveSponsor ?? program?.executive_sponsor, `programs[${index}].executiveSponsor`)
        ])
      );
    });
  }

  throwValidationErrors(errors, "Import validation failed");

  return {
    dataSource,
    programs,
    importedAt: String(input.importedAt ?? new Date().toISOString())
  };
}
