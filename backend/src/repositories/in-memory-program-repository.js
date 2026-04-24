import {
  sampleAlerts,
  sampleAuditEvents,
  sampleDataSources,
  sampleKpiSnapshots,
  sampleOptimizationConfig,
  samplePrograms,
  sampleReportTemplates,
  sampleSyncRuns,
  sampleTrackedActions
} from "@program-optimization/shared";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function upsertById(collection, item) {
  const next = collection.filter((entry) => entry.id !== item.id);
  next.unshift(item);
  return next;
}

function replaceById(collection, items, sort = null) {
  const next = new Map(collection.map((entry) => [entry.id, entry]));
  for (const item of items) next.set(item.id, item);
  const values = Array.from(next.values());
  return sort ? values.sort(sort) : values;
}

export class InMemoryProgramRepository {
  mode = "memory";

  constructor(seed = {}) {
    this.programs = clone(seed.programs ?? samplePrograms);
    this.dataSources = clone(seed.dataSources ?? sampleDataSources);
    this.reports = clone(seed.reports ?? []);
    this.actions = clone(seed.actions ?? sampleTrackedActions);
    this.alerts = clone(seed.alerts ?? sampleAlerts);
    this.syncRuns = clone(seed.syncRuns ?? sampleSyncRuns);
    this.reportTemplates = clone(seed.reportTemplates ?? sampleReportTemplates);
    this.auditEvents = clone(seed.auditEvents ?? sampleAuditEvents);
    this.kpiSnapshots = clone(seed.kpiSnapshots ?? sampleKpiSnapshots);
    this.optimizationConfig = clone(seed.optimizationConfig ?? sampleOptimizationConfig);
  }

  async seedSamples() {
    this.programs = clone(samplePrograms);
    this.dataSources = clone(sampleDataSources);
    this.reports = [];
    this.actions = clone(sampleTrackedActions);
    this.alerts = clone(sampleAlerts);
    this.syncRuns = clone(sampleSyncRuns);
    this.reportTemplates = clone(sampleReportTemplates);
    this.auditEvents = clone(sampleAuditEvents);
    this.kpiSnapshots = clone(sampleKpiSnapshots);
    this.optimizationConfig = clone(sampleOptimizationConfig);
    return this.snapshot();
  }

  snapshot() {
    return {
      programs: clone(this.programs),
      dataSources: clone(this.dataSources),
      reports: clone(this.reports),
      actions: clone(this.actions),
      alerts: clone(this.alerts),
      syncRuns: clone(this.syncRuns),
      reportTemplates: clone(this.reportTemplates),
      auditEvents: clone(this.auditEvents),
      kpiSnapshots: clone(this.kpiSnapshots),
      optimizationConfig: clone(this.optimizationConfig)
    };
  }

  async listPrograms() {
    return clone(this.programs);
  }

  async getProgram(id) {
    return clone(this.programs.find((program) => program.id === id) ?? null);
  }

  async saveProgram(program) {
    this.programs = upsertById(this.programs, clone(program));
    return clone(program);
  }

  async listDataSources() {
    return clone(this.dataSources);
  }

  async upsertPrograms(programs) {
    this.programs = replaceById(this.programs, clone(programs), (left, right) => left.name.localeCompare(right.name));
    return clone(programs);
  }

  async upsertDataSource(dataSource) {
    this.dataSources = replaceById(this.dataSources, [clone(dataSource)], (left, right) => left.name.localeCompare(right.name));
    return clone(dataSource);
  }

  async listReports() {
    return clone(this.reports);
  }

  async saveReport(report) {
    this.reports.unshift(clone(report));
    return clone(report);
  }

  async listActions() {
    return clone(this.actions);
  }

  async saveAction(action) {
    this.actions = upsertById(this.actions, clone(action));
    return clone(action);
  }

  async deleteAction(id) {
    this.actions = this.actions.filter((action) => action.id !== id);
  }

  async listAlerts() {
    return clone(this.alerts);
  }

  async saveAlert(alert) {
    this.alerts = upsertById(this.alerts, clone(alert));
    return clone(alert);
  }

  async saveProgramAlert(alert) {
    return this.saveAlert(alert);
  }

  async listSyncRuns() {
    return clone(this.syncRuns);
  }

  async saveSyncRun(syncRun) {
    this.syncRuns = upsertById(this.syncRuns, clone(syncRun));
    return clone(syncRun);
  }

  async listReportTemplates() {
    return clone(this.reportTemplates);
  }

  async saveReportTemplate(template) {
    this.reportTemplates = upsertById(this.reportTemplates, clone(template));
    return clone(template);
  }

  async listAuditEvents() {
    return clone(this.auditEvents);
  }

  async saveAuditEvent(event) {
    this.auditEvents = upsertById(this.auditEvents, clone(event));
    return clone(event);
  }

  async listKpiSnapshots() {
    return clone(this.kpiSnapshots);
  }

  async saveKpiSnapshots(snapshots) {
    this.kpiSnapshots = replaceById(this.kpiSnapshots, clone(snapshots), sortByRecordedAt);
    return clone(snapshots);
  }

  async getOptimizationConfig() {
    return clone(this.optimizationConfig);
  }

  async saveOptimizationConfig(config) {
    this.optimizationConfig = clone(config);
    return clone(config);
  }
}

function sortByRecordedAt(left, right) {
  return String(left.recordedAt ?? left.periodLabel ?? "").localeCompare(String(right.recordedAt ?? right.periodLabel ?? ""));
}
