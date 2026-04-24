import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import {
  buildDashboard,
  detectProgramAnomalies,
  enrichProgram,
  normalizeDataSourceImport,
  normalizeOptimizationThresholds,
  normalizeProgramImport,
  recommendActions,
  summarizePortfolio,
  validateAlertInput,
  validateImportPayload,
  validateOptimizationThresholdsInput,
  validateProgramUpdateInput,
  validateReportTemplateInput,
  validateTrackedActionInput
} from "@program-optimization/shared";

async function withRetry(fn, retries = 3, delayMs = 500) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = !error.statusCode || error.statusCode >= 500;
      if (!isRetryable || attempt === retries) throw error;
      await delay(delayMs * (attempt + 1));
    }
  }
}

function now() {
  return new Date().toISOString();
}

function systemActor() {
  return {
    id: "system",
    name: "System",
    role: "admin"
  };
}

function actorFields(actor = systemActor()) {
  return {
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role
  };
}

function isOpenAction(action) {
  return action.status !== "done";
}

function isOpenAlert(alert) {
  return alert.status !== "resolved";
}

function isDeleted(entry) {
  return Boolean(entry?.deletedAt);
}

function severityRank(value) {
  return { high: 0, medium: 1, low: 2 }[value] ?? 3;
}

function statusRank(value) {
  return { failed: 0, stale: 1, fresh: 2 }[value] ?? 3;
}

function definedEntries(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  );
}

function sortActions(actions) {
  return actions
    .slice()
    .sort(
      (left, right) =>
        (Number(left.priority ?? 0) || 0) - (Number(right.priority ?? 0) || 0) ||
        String(left.due ?? "").localeCompare(String(right.due ?? "")) ||
        String(left.title ?? "").localeCompare(String(right.title ?? ""))
    );
}

function sortAlerts(alerts) {
  return alerts
    .slice()
    .sort(
      (left, right) =>
        severityRank(left.severity) - severityRank(right.severity) ||
        String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? ""))
    );
}

function enrichDataSourcesWithSync(dataSources, syncRuns) {
  const latestBySource = new Map();

  for (const syncRun of syncRuns) {
    const key = syncRun.dataSourceId ?? syncRun.dataSourceName;
    if (!key) continue;
    const existing = latestBySource.get(key);
    if (!existing || String(syncRun.startedAt ?? "") > String(existing.startedAt ?? "")) {
      latestBySource.set(key, syncRun);
    }
  }

  return dataSources.map((source) => {
    const latestSyncRun = latestBySource.get(source.id) ?? latestBySource.get(source.name) ?? null;
    const syncHealth = latestSyncRun?.status === "failed" ? "failed" : source.status;
    return {
      ...source,
      syncHealth,
      latestSyncRun
    };
  });
}

function applyActionFilters(actions, filters = {}) {
  return actions.filter((action) => {
    if (filters.status && action.status !== filters.status) return false;
    if (filters.programId && action.programId !== filters.programId) return false;
    if (filters.alertId && action.alertId !== filters.alertId) return false;
    return true;
  });
}

function applyAlertFilters(alerts, filters = {}) {
  return alerts.filter((alert) => {
    if (filters.status && alert.status !== filters.status) return false;
    if (filters.severity && alert.severity !== filters.severity) return false;
    if (filters.programId && alert.programId !== filters.programId) return false;
    return true;
  });
}

function buildSnapshotEntry(program, recordedAt = now()) {
  const recordedDate = new Date(recordedAt);
  const periodLabel = Number.isNaN(recordedDate.getTime())
    ? String(recordedAt).slice(0, 7)
    : `${recordedDate.getUTCFullYear()}-${String(recordedDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const metrics = program.metrics ?? {};
  return {
    id: `${program.id}-${periodLabel}`,
    programId: program.id,
    periodLabel,
    recordedAt: Number.isNaN(recordedDate.getTime()) ? now() : recordedDate.toISOString(),
    householdsServed: Number(metrics.householdsServed ?? 0),
    householdsTarget: Number(metrics.householdsTarget ?? 0),
    staffingCapacityPct: Number(metrics.staffingCapacityPct ?? 0),
    backlogCount: Number(metrics.backlogCount ?? 0),
    complianceScore: Number(metrics.complianceScore ?? 0),
    dataFreshnessHours: Number(metrics.dataFreshnessHours ?? 0)
  };
}

function relatedAuditEvents(auditEvents, programId, trackedActions, alerts) {
  const actionIds = new Set(trackedActions.map((entry) => entry.id));
  const alertIds = new Set(alerts.map((entry) => entry.id));
  return auditEvents
    .filter(
      (event) =>
        event.entityId === programId ||
        actionIds.has(event.entityId) ||
        alertIds.has(event.entityId) ||
        event.metadata?.programId === programId
    )
    .slice()
    .sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")))
    .slice(0, 12);
}

export class ProgramService {
  constructor({ repository, reportService }) {
    this.repository = repository;
    this.reportService = reportService;
  }

  async getThresholds() {
    const config = (await this.repository.getOptimizationConfig?.()) ?? {};
    return normalizeOptimizationThresholds(config);
  }

  async getDashboard() {
    const [programs, dataSources, trackedActions, alerts, syncRuns, snapshots, thresholds] = await withRetry(() =>
      Promise.all([
        this.repository.listPrograms(),
        this.repository.listDataSources(),
        this.repository.listActions(),
        this.repository.listAlerts(),
        this.repository.listSyncRuns(),
        this.repository.listKpiSnapshots?.() ?? [],
        this.getThresholds()
      ])
    );

    const activePrograms = programs.filter((program) => !isDeleted(program));
    const activeAlerts = alerts.filter((alert) => !isDeleted(alert));
    const dashboard = buildDashboard({
      programs: activePrograms,
      dataSources,
      thresholds,
      snapshots
    });
    const enrichedSources = enrichDataSourcesWithSync(dataSources, syncRuns);
    const activeProgramIds = new Set(activePrograms.map((program) => program.id));
    const openTrackedActions = sortActions(
      trackedActions.filter(
        (action) => isOpenAction(action) && (!action.programId || activeProgramIds.has(action.programId))
      )
    );
    const unresolvedAlerts = sortAlerts(
      activeAlerts.filter(
        (alert) => isOpenAlert(alert) && (!alert.programId || activeProgramIds.has(alert.programId))
      )
    );
    const degradedSources = enrichedSources
      .filter((source) => source.syncHealth !== "fresh")
      .sort(
        (left, right) =>
          statusRank(left.syncHealth) - statusRank(right.syncHealth) ||
          Number(right.freshnessHours ?? 0) - Number(left.freshnessHours ?? 0)
      );

    return {
      ...dashboard,
      dataSources: enrichedSources,
      actions: openTrackedActions.length > 0 ? openTrackedActions : dashboard.actions,
      trackedActions: openTrackedActions,
      recommendedActions: dashboard.actions,
      alerts: unresolvedAlerts,
      degradedSources,
      syncRuns: syncRuns.slice(0, 10),
      thresholds
    };
  }

  async listPrograms(options = {}) {
    const [programs, snapshots, thresholds] = await Promise.all([
      this.repository.listPrograms(),
      this.repository.listKpiSnapshots?.() ?? [],
      this.getThresholds()
    ]);
    return programs
      .filter((program) => options.includeDeleted || !isDeleted(program))
      .map((program) =>
        enrichProgram(program, {
          thresholds,
          snapshots: snapshots.filter((snapshot) => snapshot.programId === program.id)
        })
      );
  }

  async getProgram(programId, options = {}) {
    const program = await this.repository.getProgram(programId);
    if (!program) return null;
    if (!options.includeDeleted && isDeleted(program)) return null;
    return program;
  }

  async getProgramDetail(id, options = {}) {
    const [program, dataSources, trackedActions, alerts, syncRuns, snapshots, thresholds, auditEvents] = await Promise.all([
      this.getProgram(id, options),
      this.repository.listDataSources(),
      this.repository.listActions(),
      this.repository.listAlerts(),
      this.repository.listSyncRuns(),
      this.repository.listKpiSnapshots?.() ?? [],
      this.getThresholds(),
      this.repository.listAuditEvents()
    ]);
    if (!program) return null;

    const relatedSources = enrichDataSourcesWithSync(
      dataSources.filter((source) => source.programIds.includes(id)),
      syncRuns
    );
    const relatedSnapshots = snapshots.filter((snapshot) => snapshot.programId === id);
    const anomalies = detectProgramAnomalies([program], relatedSources, { thresholds, snapshots: relatedSnapshots });
    const relatedAlerts = sortAlerts(alerts.filter((alert) => alert.programId === id && !isDeleted(alert)));
    const relatedTrackedActions = sortActions(trackedActions.filter((action) => action.programId === id));
    const recommendedActions = recommendActions([program], anomalies, { thresholds, snapshots: relatedSnapshots });
    const syncHistory = syncRuns
      .filter((run) => relatedSources.some((source) => source.id === run.dataSourceId || source.name === run.dataSourceName))
      .sort((left, right) => String(right.startedAt ?? "").localeCompare(String(left.startedAt ?? "")));

    return {
      program: enrichProgram(program, { thresholds, snapshots: relatedSnapshots }),
      dataSources: relatedSources,
      anomalies,
      alerts: relatedAlerts,
      actions: relatedTrackedActions.length > 0 ? relatedTrackedActions : recommendedActions,
      trackedActions: relatedTrackedActions,
      recommendedActions,
      syncHistory,
      thresholds,
      snapshots: relatedSnapshots,
      auditTrail: relatedAuditEvents(auditEvents, id, relatedTrackedActions, relatedAlerts)
    };
  }

  async listAnomalies() {
    const [programs, dataSources, snapshots, thresholds] = await Promise.all([
      this.repository.listPrograms(),
      this.repository.listDataSources(),
      this.repository.listKpiSnapshots?.() ?? [],
      this.getThresholds()
    ]);
    const activePrograms = programs.filter((program) => !isDeleted(program));
    return {
      summary: summarizePortfolio(activePrograms, { thresholds, snapshots }),
      anomalies: detectProgramAnomalies(activePrograms, dataSources, { thresholds, snapshots }),
      thresholds
    };
  }

  async listDataSources() {
    const [dataSources, syncRuns] = await Promise.all([
      this.repository.listDataSources(),
      this.repository.listSyncRuns()
    ]);
    return enrichDataSourcesWithSync(dataSources, syncRuns);
  }

  async listTrackedActions(filters = {}) {
    return sortActions(applyActionFilters(await this.repository.listActions(), filters));
  }

  async getTrackedAction(id) {
    return (await this.repository.listActions()).find((action) => action.id === id) ?? null;
  }

  async saveTrackedAction(input, actor = systemActor()) {
    const existing = input.id ? await this.getTrackedAction(input.id) : null;
    const validated = validateTrackedActionInput({ ...existing, ...input });
    const timestamp = now();
    const isCompleted = validated.status === "done";
    const action = {
      ...existing,
      ...validated,
      id: validated.id || randomUUID(),
      createdAt: existing?.createdAt ?? input.createdAt ?? timestamp,
      updatedAt: timestamp,
      completedAt: isCompleted ? existing?.completedAt ?? input.completedAt ?? timestamp : null
    };

    const saved = await this.repository.saveAction(action);
    await this.repository.saveAuditEvent({
      id: randomUUID(),
      entityType: "tracked-action",
      entityId: saved.id,
      action: validated.id ? "updated" : "created",
      detail: `${saved.title} assigned to ${saved.owner}`,
      metadata: { programId: saved.programId, status: saved.status },
      ...actorFields(actor),
      createdAt: timestamp
    });
    return saved;
  }

  async deleteTrackedAction(id, actor = systemActor()) {
    await this.repository.deleteAction(id);
    await this.repository.saveAuditEvent({
      id: randomUUID(),
      entityType: "tracked-action",
      entityId: id,
      action: "deleted",
      detail: `Tracked action ${id} deleted`,
      metadata: {},
      ...actorFields(actor),
      createdAt: now()
    });
  }

  async listAlerts(filters = {}, options = {}) {
    const allAlerts = await this.repository.listAlerts();
    const visibleAlerts = allAlerts.filter((alert) => options.includeDeleted || !isDeleted(alert));
    return sortAlerts(applyAlertFilters(visibleAlerts, filters));
  }

  async getAlert(id, options = {}) {
    return (await this.listAlerts({}, options)).find((alert) => alert.id === id) ?? null;
  }

  async saveAlert(input, actor = systemActor()) {
    const existing = input.id ? await this.getAlert(input.id, { includeDeleted: true }) : null;
    const validated = validateAlertInput({ ...existing, ...input });
    const timestamp = now();
    const resolvedAt = validated.status === "resolved" ? input.resolvedAt ?? timestamp : null;
    const alert = {
      ...existing,
      ...validated,
      id: validated.id || randomUUID(),
      createdAt: existing?.createdAt ?? input.createdAt ?? timestamp,
      updatedAt: timestamp,
      resolvedAt: validated.status === "resolved" ? existing?.resolvedAt ?? resolvedAt : null,
      deletedAt: existing?.deletedAt ?? null,
      deletedBy: existing?.deletedBy ?? null
    };

    const saved = await this.repository.saveAlert(alert);
    await this.repository.saveAuditEvent({
      id: randomUUID(),
      entityType: "alert",
      entityId: saved.id,
      action: validated.id ? "updated" : "created",
      detail: `${saved.category} alert saved with ${saved.severity} severity`,
      metadata: { programId: saved.programId, status: saved.status },
      ...actorFields(actor),
      createdAt: timestamp
    });
    return saved;
  }

  async deleteAlert(id, actor = systemActor()) {
    const existing = await this.getAlert(id, { includeDeleted: true });
    if (!existing) return null;
    const timestamp = now();
    const nextAlert = {
      ...existing,
      status: existing.status === "resolved" ? existing.status : "resolved",
      updatedAt: timestamp,
      resolvedAt: existing.resolvedAt ?? timestamp,
      deletedAt: timestamp,
      deletedBy: actor.id
    };
    const saved = await this.repository.saveAlert(nextAlert);
    await this.repository.saveAuditEvent({
      id: randomUUID(),
      entityType: "alert",
      entityId: id,
      action: "soft-deleted",
      detail: `${existing.title} archived`,
      metadata: { programId: existing.programId, status: saved.status },
      ...actorFields(actor),
      createdAt: timestamp
    });
    return saved;
  }

  async updateProgram(id, input, actor = systemActor()) {
    const existing = await this.getProgram(id, { includeDeleted: true });
    if (!existing) return null;

    const validated = validateProgramUpdateInput({ ...input, id });
    const timestamp = now();
    const updated = {
      ...existing,
      ...definedEntries({
        name: validated.name,
        programType: validated.programType,
        utilityPartner: validated.utilityPartner,
        state: validated.state,
        owner: validated.owner,
        executiveSponsor: validated.executiveSponsor,
        status: validated.status,
        contractValue: validated.contractValue,
        period: validated.period,
        objective: validated.objective,
        targetAudience: validated.targetAudience
      }),
      metrics: {
        ...(existing.metrics ?? {}),
        ...(validated.metrics ?? {})
      }
    };

    const saved = await this.repository.saveProgram(updated);
    await this.repository.saveKpiSnapshots?.([buildSnapshotEntry(saved, timestamp)]);
    await this.repository.saveAuditEvent({
      id: randomUUID(),
      entityType: "program",
      entityId: saved.id,
      action: "updated",
      detail: `Updated ${saved.name}`,
      metadata: { status: saved.status },
      ...actorFields(actor),
      createdAt: timestamp
    });
    return saved;
  }

  async deleteProgram(id, actor = systemActor()) {
    const existing = await this.getProgram(id, { includeDeleted: true });
    if (!existing) return null;
    const timestamp = now();
    const saved = await this.repository.saveProgram({
      ...existing,
      deletedAt: timestamp,
      deletedBy: actor.id,
      status: "archived"
    });
    await this.repository.saveAuditEvent({
      id: randomUUID(),
      entityType: "program",
      entityId: id,
      action: "soft-deleted",
      detail: `${existing.name} archived`,
      metadata: {},
      ...actorFields(actor),
      createdAt: timestamp
    });
    return saved;
  }

  async listSyncRuns() {
    return (await this.repository.listSyncRuns())
      .slice()
      .sort((left, right) => String(right.startedAt ?? "").localeCompare(String(left.startedAt ?? "")));
  }

  async listReportTemplates() {
    return this.repository.listReportTemplates();
  }

  async saveReportTemplate(input, actor = systemActor()) {
    const existing = input.id
      ? (await this.repository.listReportTemplates()).find((template) => template.id === input.id) ?? null
      : null;
    const validated = validateReportTemplateInput({ ...existing, ...input });
    const timestamp = now();
    const template = {
      ...existing,
      ...validated,
      id: validated.id || randomUUID(),
      createdAt: existing?.createdAt ?? input.createdAt ?? timestamp,
      updatedAt: timestamp
    };

    const saved = await this.repository.saveReportTemplate(template);
    await this.repository.saveAuditEvent({
      id: randomUUID(),
      entityType: "report-template",
      entityId: saved.id,
      action: validated.id ? "updated" : "created",
      detail: `Saved report template ${saved.name}`,
      metadata: { focus: saved.focus, audience: saved.audience },
      ...actorFields(actor),
      createdAt: timestamp
    });
    return saved;
  }

  async listAuditEvents() {
    return this.repository.listAuditEvents();
  }

  async listKpiSnapshots(programId = null) {
    const snapshots = (await this.repository.listKpiSnapshots?.()) ?? [];
    return programId ? snapshots.filter((snapshot) => snapshot.programId === programId) : snapshots;
  }

  async listOptimizationThresholds() {
    return this.getThresholds();
  }

  async saveOptimizationThresholds(input, actor = systemActor()) {
    const current = await this.getThresholds();
    const validated = validateOptimizationThresholdsInput(input);
    const next = {
      ...current,
      ...validated,
      id: "default-thresholds",
      updatedAt: now(),
      updatedBy: actor.id
    };
    const saved = await this.repository.saveOptimizationConfig(next);
    await this.repository.saveAuditEvent({
      id: randomUUID(),
      entityType: "optimization-thresholds",
      entityId: next.id,
      action: "updated",
      detail: "Updated optimization thresholds",
      metadata: validated,
      ...actorFields(actor),
      createdAt: next.updatedAt
    });
    return normalizeOptimizationThresholds(saved);
  }

  async importDataSource(input, actor = systemActor()) {
    const startedAt = now();
    const fallbackName = input?.dataSource?.name ? String(input.dataSource.name) : "Imported data source";

    try {
      const validated = validateImportPayload(input);
      const programs = validated.programs.map((program, index) => normalizeProgramImport(program, index));
      const dataSource = normalizeDataSourceImport(
        validated.dataSource,
        programs.map((program) => program.id),
        validated.importedAt
      );

      await this.repository.upsertPrograms(programs);
      await this.repository.upsertDataSource(dataSource);
      await this.repository.saveKpiSnapshots?.(programs.map((program) => buildSnapshotEntry(program, dataSource.lastSyncAt)));

      const syncRun = await this.repository.saveSyncRun({
        id: randomUUID(),
        dataSourceId: dataSource.id,
        dataSourceName: dataSource.name,
        status: "success",
        importedAt: dataSource.lastSyncAt,
        startedAt,
        completedAt: now(),
        processedProgramCount: programs.length,
        errorCount: 0,
        errors: []
      });

      const alerts = [];
      if (dataSource.status !== "fresh") {
        alerts.push(
          await this.saveAlert(
            {
              programId: dataSource.programIds[0] ?? null,
              severity: dataSource.status === "failed" || dataSource.qualityScore < 85 ? "high" : "medium",
              category: "Data",
              title: `${dataSource.name} import requires review`,
              detail: `Imported with ${dataSource.status} status at ${dataSource.qualityScore}% quality and ${dataSource.freshnessHours}h freshness.`,
              source: "import"
            },
            actor
          )
        );
      }

      await this.repository.saveAuditEvent({
        id: randomUUID(),
        entityType: "data-source-import",
        entityId: syncRun.id,
        action: "completed",
        detail: `Imported ${programs.length} programs from ${dataSource.name}`,
        metadata: { dataSourceId: dataSource.id, programIds: dataSource.programIds },
        ...actorFields(actor),
        createdAt: now()
      });

      return {
        dataSource,
        programs,
        syncRun,
        alerts,
        validationErrors: []
      };
    } catch (error) {
      const validationErrors = error.validationErrors ?? [error.message];
      const syncRun = await this.repository.saveSyncRun({
        id: randomUUID(),
        dataSourceId: null,
        dataSourceName: fallbackName,
        status: "failed",
        importedAt: input?.importedAt ?? startedAt,
        startedAt,
        completedAt: now(),
        processedProgramCount: 0,
        errorCount: validationErrors.length,
        errors: validationErrors
      });

      await this.repository.saveAuditEvent({
        id: randomUUID(),
        entityType: "data-source-import",
        entityId: syncRun.id,
        action: "failed",
        detail: `Import failed for ${fallbackName}`,
        metadata: { validationErrors },
        ...actorFields(actor),
        createdAt: now()
      });

      error.statusCode = error.statusCode ?? 400;
      error.validationErrors = validationErrors;
      error.syncRun = syncRun;
      throw error;
    }
  }

  async listReports() {
    return this.repository.listReports();
  }

  async getReport(id) {
    return (await this.repository.listReports()).find((report) => report.id === id) ?? null;
  }

  async generateReport(input, actor = systemActor()) {
    const [programs, dataSources, snapshots, thresholds] = await Promise.all([
      this.repository.listPrograms(),
      this.repository.listDataSources(),
      this.repository.listKpiSnapshots?.() ?? [],
      this.getThresholds()
    ]);
    const activePrograms = programs.filter((program) => !isDeleted(program));
    const report = await this.reportService.generateExecutiveBrief({
      programs: activePrograms,
      dataSources,
      input,
      thresholds,
      snapshots
    });
    const saved = await this.repository.saveReport(report);
    await this.repository.saveAuditEvent({
      id: randomUUID(),
      entityType: "executive-report",
      entityId: saved.id,
      action: "generated",
      detail: `Generated ${saved.title}`,
      metadata: { focus: saved.focus, audience: saved.audience, mode: saved.mode },
      ...actorFields(actor),
      createdAt: saved.createdAt
    });
    return saved;
  }
}
