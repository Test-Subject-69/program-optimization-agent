import { createClient } from "@supabase/supabase-js";

function programFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    programType: row.program_type,
    utilityPartner: row.utility_partner,
    state: row.state,
    owner: row.owner,
    executiveSponsor: row.executive_sponsor,
    status: row.status,
    contractValue: row.contract_value,
    period: row.period,
    objective: row.objective,
    targetAudience: row.target_audience,
    metrics: row.metrics ?? {},
    monthlyTrend: row.monthly_trend ?? [],
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by
  };
}

function programToRow(program) {
  return {
    id: program.id,
    name: program.name,
    program_type: program.programType,
    utility_partner: program.utilityPartner,
    state: program.state,
    owner: program.owner,
    executive_sponsor: program.executiveSponsor,
    status: program.status,
    contract_value: program.contractValue,
    period: program.period,
    objective: program.objective,
    target_audience: program.targetAudience,
    metrics: program.metrics ?? {},
    monthly_trend: program.monthlyTrend ?? [],
    deleted_at: program.deletedAt ?? null,
    deleted_by: program.deletedBy ?? null
  };
}

function dataSourceFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    sourceType: row.source_type,
    owner: row.owner,
    status: row.status,
    lastSyncAt: row.last_sync_at,
    freshnessHours: row.freshness_hours,
    records: row.records,
    qualityScore: row.quality_score,
    programIds: row.program_ids ?? []
  };
}

function dataSourceToRow(dataSource) {
  return {
    id: dataSource.id,
    name: dataSource.name,
    source_type: dataSource.sourceType,
    owner: dataSource.owner,
    status: dataSource.status,
    last_sync_at: dataSource.lastSyncAt,
    freshness_hours: dataSource.freshnessHours,
    records: dataSource.records,
    quality_score: dataSource.qualityScore,
    program_ids: dataSource.programIds ?? []
  };
}

function reportFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    focus: row.focus,
    audience: row.audience,
    mode: row.mode,
    summary: row.summary,
    risks: row.risks ?? [],
    actions: row.actions ?? [],
    createdAt: row.created_at
  };
}

function actionFromRow(row) {
  return {
    id: row.id,
    programId: row.program_id,
    alertId: row.alert_id,
    title: row.title,
    reason: row.reason,
    owner: row.owner,
    due: row.due,
    status: row.status,
    priority: row.priority,
    completionNotes: row.completion_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at
  };
}

function actionToRow(action) {
  return {
    id: action.id,
    program_id: action.programId,
    alert_id: action.alertId,
    title: action.title,
    reason: action.reason,
    owner: action.owner,
    due: action.due,
    status: action.status,
    priority: action.priority,
    completion_notes: action.completionNotes ?? "",
    created_at: action.createdAt,
    updated_at: action.updatedAt,
    completed_at: action.completedAt
  };
}

function alertFromRow(row) {
  return {
    id: row.id,
    programId: row.program_id,
    severity: row.severity,
    category: row.category,
    title: row.title,
    detail: row.detail,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by
  };
}

function alertToRow(alert) {
  return {
    id: alert.id,
    program_id: alert.programId,
    severity: alert.severity,
    category: alert.category,
    title: alert.title,
    detail: alert.detail,
    status: alert.status,
    source: alert.source,
    created_at: alert.createdAt,
    updated_at: alert.updatedAt,
    resolved_at: alert.resolvedAt,
    deleted_at: alert.deletedAt ?? null,
    deleted_by: alert.deletedBy ?? null
  };
}

function syncRunFromRow(row) {
  return {
    id: row.id,
    dataSourceId: row.data_source_id,
    dataSourceName: row.data_source_name,
    status: row.status,
    importedAt: row.imported_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    processedProgramCount: row.processed_program_count,
    errorCount: row.error_count,
    errors: row.errors ?? []
  };
}

function syncRunToRow(syncRun) {
  return {
    id: syncRun.id,
    data_source_id: syncRun.dataSourceId,
    data_source_name: syncRun.dataSourceName,
    status: syncRun.status,
    imported_at: syncRun.importedAt,
    started_at: syncRun.startedAt,
    completed_at: syncRun.completedAt,
    processed_program_count: syncRun.processedProgramCount,
    error_count: syncRun.errorCount,
    errors: syncRun.errors ?? []
  };
}

function reportTemplateFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    focus: row.focus,
    audience: row.audience,
    includeActions: row.include_actions,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function reportTemplateToRow(template) {
  return {
    id: template.id,
    name: template.name,
    focus: template.focus,
    audience: template.audience,
    include_actions: template.includeActions,
    created_at: template.createdAt,
    updated_at: template.updatedAt
  };
}

function auditEventFromRow(row) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    detail: row.detail,
    metadata: row.metadata ?? {},
    actorId: row.actor_id ?? null,
    actorName: row.actor_name ?? null,
    actorRole: row.actor_role ?? null,
    createdAt: row.created_at
  };
}

function auditEventToRow(event) {
  return {
    id: event.id,
    entity_type: event.entityType,
    entity_id: event.entityId,
    action: event.action,
    detail: event.detail,
    metadata: event.metadata ?? {},
    actor_id: event.actorId ?? null,
    actor_name: event.actorName ?? null,
    actor_role: event.actorRole ?? null,
    created_at: event.createdAt
  };
}

function kpiSnapshotFromRow(row) {
  return {
    id: row.id,
    programId: row.program_id,
    periodLabel: row.period_label,
    recordedAt: row.recorded_at,
    householdsServed: row.households_served,
    householdsTarget: row.households_target,
    staffingCapacityPct: row.staffing_capacity_pct,
    backlogCount: row.backlog_count,
    complianceScore: row.compliance_score,
    dataFreshnessHours: row.data_freshness_hours
  };
}

function kpiSnapshotToRow(snapshot) {
  return {
    id: snapshot.id,
    program_id: snapshot.programId,
    period_label: snapshot.periodLabel,
    recorded_at: snapshot.recordedAt,
    households_served: snapshot.householdsServed,
    households_target: snapshot.householdsTarget,
    staffing_capacity_pct: snapshot.staffingCapacityPct,
    backlog_count: snapshot.backlogCount,
    compliance_score: snapshot.complianceScore,
    data_freshness_hours: snapshot.dataFreshnessHours
  };
}

function optimizationThresholdsFromRow(row) {
  return {
    id: row.id,
    deliveryWarningPct: row.delivery_warning_pct,
    deliveryCriticalPct: row.delivery_critical_pct,
    staffingTargetPct: row.staffing_target_pct,
    staffingCriticalPct: row.staffing_critical_pct,
    openRolesWarning: row.open_roles_warning,
    equityGapWarningPct: row.equity_gap_warning_pct,
    complianceMinimumScore: row.compliance_minimum_score,
    dataFreshnessWarningHours: row.data_freshness_warning_hours,
    dataQualityMinimumPct: row.data_quality_minimum_pct,
    dataQualityCriticalPct: row.data_quality_critical_pct,
    healthyScoreMinimum: row.healthy_score_minimum,
    monitorScoreMinimum: row.monitor_score_minimum,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by
  };
}

function optimizationThresholdsToRow(config) {
  return {
    id: config.id,
    delivery_warning_pct: config.deliveryWarningPct,
    delivery_critical_pct: config.deliveryCriticalPct,
    staffing_target_pct: config.staffingTargetPct,
    staffing_critical_pct: config.staffingCriticalPct,
    open_roles_warning: config.openRolesWarning,
    equity_gap_warning_pct: config.equityGapWarningPct,
    compliance_minimum_score: config.complianceMinimumScore,
    data_freshness_warning_hours: config.dataFreshnessWarningHours,
    data_quality_minimum_pct: config.dataQualityMinimumPct,
    data_quality_critical_pct: config.dataQualityCriticalPct,
    healthy_score_minimum: config.healthyScoreMinimum,
    monitor_score_minimum: config.monitorScoreMinimum,
    updated_at: config.updatedAt,
    updated_by: config.updatedBy
  };
}

function reportToRow(report) {
  return {
    id: report.id,
    title: report.title,
    focus: report.focus,
    audience: report.audience,
    mode: report.mode,
    summary: report.summary,
    risks: report.risks ?? [],
    actions: report.actions ?? [],
    created_at: report.createdAt
  };
}

async function throwIfError(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export class SupabaseProgramRepository {
  mode = "supabase";

  constructor({ supabaseUrl, serviceRoleKey }) {
    this.client = createClient(supabaseUrl, serviceRoleKey);
  }

  async seedSamples() {
    throw new Error("Sample seeding is only available in memory mode. Use docs/sample-program-metrics.csv for imports.");
  }

  async listPrograms() {
    const rows = await throwIfError(
      await this.client.from("programs").select("*").order("name", { ascending: true })
    );
    return rows.map(programFromRow);
  }

  async getProgram(id) {
    const row = await throwIfError(await this.client.from("programs").select("*").eq("id", id).maybeSingle());
    return row ? programFromRow(row) : null;
  }

  async saveProgram(program) {
    const row = await throwIfError(
      await this.client.from("programs").upsert(programToRow(program)).select("*").single()
    );
    return programFromRow(row);
  }

  async listDataSources() {
    const rows = await throwIfError(
      await this.client.from("data_sources").select("*").order("name", { ascending: true })
    );
    return rows.map(dataSourceFromRow);
  }

  async upsertPrograms(programs) {
    const rows = await throwIfError(
      await this.client.from("programs").upsert(programs.map(programToRow)).select("*")
    );
    return rows.map(programFromRow);
  }

  async upsertDataSource(dataSource) {
    const row = await throwIfError(
      await this.client.from("data_sources").upsert(dataSourceToRow(dataSource)).select("*").single()
    );
    return dataSourceFromRow(row);
  }

  async listReports() {
    const rows = await throwIfError(
      await this.client.from("executive_reports").select("*").order("created_at", { ascending: false }).limit(20)
    );
    return rows.map(reportFromRow);
  }

  async saveReport(report) {
    const row = await throwIfError(
      await this.client.from("executive_reports").insert(reportToRow(report)).select("*").single()
    );
    return reportFromRow(row);
  }

  async listActions() {
    const rows = await throwIfError(
      await this.client.from("tracked_actions").select("*").order("created_at", { ascending: false })
    );
    return rows.map(actionFromRow);
  }

  async saveAction(action) {
    const row = await throwIfError(
      await this.client.from("tracked_actions").upsert(actionToRow(action)).select("*").single()
    );
    return actionFromRow(row);
  }

  async listAlerts() {
    const rows = await throwIfError(
      await this.client.from("alerts").select("*").order("created_at", { ascending: false })
    );
    return rows.map(alertFromRow);
  }

  async saveAlert(alert) {
    const row = await throwIfError(
      await this.client.from("alerts").upsert(alertToRow(alert)).select("*").single()
    );
    return alertFromRow(row);
  }

  async listSyncRuns() {
    const rows = await throwIfError(
      await this.client.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(50)
    );
    return rows.map(syncRunFromRow);
  }

  async saveSyncRun(syncRun) {
    const row = await throwIfError(
      await this.client.from("sync_runs").upsert(syncRunToRow(syncRun)).select("*").single()
    );
    return syncRunFromRow(row);
  }

  async listReportTemplates() {
    const rows = await throwIfError(
      await this.client.from("report_templates").select("*").order("name", { ascending: true })
    );
    return rows.map(reportTemplateFromRow);
  }

  async saveReportTemplate(template) {
    const row = await throwIfError(
      await this.client.from("report_templates").upsert(reportTemplateToRow(template)).select("*").single()
    );
    return reportTemplateFromRow(row);
  }

  async listAuditEvents() {
    const rows = await throwIfError(
      await this.client.from("audit_events").select("*").order("created_at", { ascending: false }).limit(100)
    );
    return rows.map(auditEventFromRow);
  }

  async saveAuditEvent(event) {
    const row = await throwIfError(
      await this.client.from("audit_events").upsert(auditEventToRow(event)).select("*").single()
    );
    return auditEventFromRow(row);
  }

  async listKpiSnapshots() {
    const rows = await throwIfError(
      await this.client.from("kpi_snapshots").select("*").order("recorded_at", { ascending: true })
    );
    return rows.map(kpiSnapshotFromRow);
  }

  async saveKpiSnapshots(snapshots) {
    const rows = await throwIfError(
      await this.client.from("kpi_snapshots").upsert(snapshots.map(kpiSnapshotToRow)).select("*")
    );
    return rows.map(kpiSnapshotFromRow);
  }

  async getOptimizationConfig() {
    const row = await throwIfError(
      await this.client.from("optimization_thresholds").select("*").eq("id", "default-thresholds").maybeSingle()
    );
    return row ? optimizationThresholdsFromRow(row) : null;
  }

  async saveOptimizationConfig(config) {
    const row = await throwIfError(
      await this.client.from("optimization_thresholds").upsert(optimizationThresholdsToRow(config)).select("*").single()
    );
    return optimizationThresholdsFromRow(row);
  }
}
