"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  createAction,
  deleteAlert,
  deleteProgram,
  loadProgram,
  updateAction,
  updateAlert,
  updateProgram
} from "../../../lib/api";
import { diagnoseProgramAi } from "../../../lib/ai-api";
import {
  compactNumber,
  formatDate,
  formatDateTime,
  isOverdue,
  money,
  percent
} from "../../../lib/format";
import {
  AnimateIn,
  DetailList,
  FieldMessage,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  Progress,
  SkeletonStats,
  SkeletonTable,
  Stat,
  StatStrip,
  Status,
  Table,
  ToastContainer,
  useToast
} from "../../../components/ui";
import { useSession } from "../../../components/session-context";

function nextWeekDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function isPastDate(value) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  parsed.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today;
}

function buildProgramForm(program) {
  return {
    owner: program?.owner ?? "",
    executiveSponsor: program?.executiveSponsor ?? "",
    status: program?.status ?? "active",
    householdsTarget: String(program?.metrics?.householdsTarget ?? ""),
    staffingCapacityPct: String(program?.metrics?.staffingCapacityPct ?? ""),
    backlogCount: String(program?.metrics?.backlogCount ?? ""),
    complianceScore: String(program?.metrics?.complianceScore ?? ""),
    dataFreshnessHours: String(program?.metrics?.dataFreshnessHours ?? "")
  };
}

function validateProgramForm(form) {
  return {
    owner: form.owner.trim() ? "" : "Owner is required.",
    executiveSponsor: form.executiveSponsor.trim() ? "" : "Executive sponsor is required.",
    householdsTarget:
      form.householdsTarget === "" || Number(form.householdsTarget) < 0 ? "Target must be zero or higher." : "",
    staffingCapacityPct:
      form.staffingCapacityPct === "" || Number(form.staffingCapacityPct) < 0 || Number(form.staffingCapacityPct) > 100
        ? "Staffing capacity must be between 0 and 100."
        : "",
    backlogCount: form.backlogCount === "" || Number(form.backlogCount) < 0 ? "Backlog must be zero or higher." : "",
    complianceScore:
      form.complianceScore === "" || Number(form.complianceScore) < 0 || Number(form.complianceScore) > 100
        ? "Compliance score must be between 0 and 100."
        : "",
    dataFreshnessHours:
      form.dataFreshnessHours === "" || Number(form.dataFreshnessHours) < 0 ? "Freshness hours must be zero or higher." : ""
  };
}

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? "";
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const { toast, showToast } = useToast();
  const { role } = useSession();
  const canOperate = role !== "read-only";
  const canAdmin = role === "admin";
  const [actionForm, setActionForm] = useState({
    title: "",
    owner: "",
    due: nextWeekDate(),
    reason: ""
  });
  const [programForm, setProgramForm] = useState(buildProgramForm(null));
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);

  async function handleDiagnosis() {
    setDiagnosing(true);
    try {
      const data = await diagnoseProgramAi(programId);
      setDiagnosis(data.diagnosis);
    } catch {
      setDiagnosis("Unable to generate AI diagnosis. Please try again.");
    } finally {
      setDiagnosing(false);
    }
  }

  async function refresh() {
    if (!programId) return;
    setError("");
    const nextDetail = await loadProgram(programId);
    setDetail(nextDetail);
    setActionForm((current) => ({
      ...current,
      owner: current.owner || nextDetail.program.executiveSponsor || nextDetail.program.owner,
      due: current.due || nextWeekDate()
    }));
    setProgramForm(buildProgramForm(nextDetail.program));
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Unable to load program"));
  }, [programId]);

  const program = detail?.program;

  const actionErrors = useMemo(
    () => ({
      title: actionForm.title.trim() ? "" : "Action is required.",
      owner: actionForm.owner.trim() ? "" : "Owner is required.",
      due: actionForm.due && isPastDate(actionForm.due) ? "Due date is in the past." : ""
    }),
    [actionForm]
  );

  const programErrors = useMemo(() => validateProgramForm(programForm), [programForm]);

  const hasActionErrors = Object.values(actionErrors).some(Boolean);
  const hasProgramErrors = Object.values(programErrors).some(Boolean);

  async function handleCreateAction(event) {
    event.preventDefault();
    if (hasActionErrors) return;
    setIsBusy(true);
    try {
      await createAction({
        programId,
        title: actionForm.title,
        owner: actionForm.owner,
        due: actionForm.due,
        reason: actionForm.reason,
        priority: detail?.trackedActions.length ? detail.trackedActions.length + 1 : 1
      });
      setActionForm((current) => ({ ...current, title: "", reason: "" }));
      await refresh();
      showToast("success", "Action created successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save action");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveProgram(event) {
    event.preventDefault();
    if (hasProgramErrors) return;
    setIsBusy(true);
    try {
      await updateProgram(programId, {
        owner: programForm.owner,
        executiveSponsor: programForm.executiveSponsor,
        status: programForm.status,
        metrics: {
          householdsTarget: Number(programForm.householdsTarget),
          staffingCapacityPct: Number(programForm.staffingCapacityPct),
          backlogCount: Number(programForm.backlogCount),
          complianceScore: Number(programForm.complianceScore),
          dataFreshnessHours: Number(programForm.dataFreshnessHours)
        }
      });
      await refresh();
      showToast("success", "Program updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update program");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteProgram() {
    setIsBusy(true);
    try {
      await deleteProgram(programId);
      showToast("success", "Program archived");
      router.push("/programs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive program");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleActionStatus(id, status) {
    setIsBusy(true);
    try {
      await updateAction(id, { status });
      await refresh();
      showToast("success", "Action updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update action");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAlertStatus(id, status) {
    setIsBusy(true);
    try {
      await updateAlert(id, { status });
      await refresh();
      showToast("success", "Alert updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update alert");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteAlert(id) {
    setIsBusy(true);
    try {
      await deleteAlert(id);
      await refresh();
      showToast("success", "Alert archived");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive alert");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <ToastContainer toast={toast} />
      <PageHeader
        title={program?.name ?? "Program detail"}
        actions={<a className="button-link secondary" href="/programs">Back to programs</a>}
      >
        {program?.objective ?? "Review program performance, data sources, anomalies, and recommended actions."}
      </PageHeader>
      <Notice>{error}</Notice>

      {!detail || !program ? (
        <div className="page-body">
          <SkeletonStats />
          <div className="content-grid">
            <div className="panel animate-in"><SkeletonTable rows={5} cols={2} /></div>
            <div className="panel animate-in"><SkeletonTable rows={4} cols={2} /></div>
            <div className="panel wide animate-in"><SkeletonTable rows={4} cols={6} /></div>
          </div>
        </div>
      ) : (
        <div className="page-body">
          <AnimateIn>
            <StatStrip>
              <Stat label="Health" value={<Status value={program.kpis.healthStatus} />} help={`${program.kpis.healthScore}/100`} />
              <Stat label="Delivery" value={percent(program.kpis.deliveryPct)} help={`${compactNumber(program.metrics.householdsServed)} of ${compactNumber(program.metrics.householdsTarget)}`} />
              <Stat label="Tracked actions" value={detail.trackedActions.length} help={`${detail.trackedActions.filter((action) => isOverdue(action.due)).length} overdue`} />
              <Stat label="Open alerts" value={detail.alerts.length} help={`${detail.alerts.filter((alert) => alert.severity === "high").length} high priority`} />
            </StatStrip>
          </AnimateIn>

          <div className="content-grid">
            <Panel
              title="AI Analysis"
              className="wide"
              actions={
                <button type="button" className="secondary table-button" onClick={handleDiagnosis} disabled={diagnosing}>
                  {diagnosing ? "Analyzing..." : diagnosis ? "Re-analyze" : "Run AI diagnosis"}
                </button>
              }
            >
              {diagnosis ? (
                <div className="brief-body">
                  {diagnosis.split("\n").map((line, i) =>
                    line.trim() ? <p key={i}>{line}</p> : null
                  )}
                </div>
              ) : (
                <div className="empty">
                  <p>Click "Run AI diagnosis" to get an AI-powered assessment of this program's health, risks, and recommended actions.</p>
                </div>
              )}
            </Panel>

            <Panel title="Program summary">
              <DetailList
                items={[
                  { label: "Partner", value: program.utilityPartner },
                  { label: "Program type", value: program.programType },
                  { label: "Owner", value: program.owner },
                  { label: "Executive sponsor", value: program.executiveSponsor },
                  { label: "Target audience", value: program.targetAudience },
                  { label: "Contract value", value: money(program.contractValue) }
                ]}
              />
            </Panel>

            <Panel title="Trend and forecast">
              <DetailList
                items={[
                  { label: "Month over month", value: `${program.trend.monthOverMonthDeliveryDelta >= 0 ? "+" : ""}${program.trend.monthOverMonthDeliveryDelta} points` },
                  { label: "Direction", value: program.trend.direction },
                  { label: "Forecast", value: `${percent(program.forecast.projectedDeliveryPct)} (${program.forecast.status})` },
                  { label: "Summary", value: program.forecast.summary }
                ]}
              />
            </Panel>

            <Panel title="Delivery snapshots" className="wide">
              <Table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Served</th>
                    <th>Target</th>
                    <th>Delivery</th>
                    <th>Staffing</th>
                    <th>Backlog</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.snapshots.length === 0 ? (
                    <tr><td colSpan="6">No delivery snapshots recorded yet.</td></tr>
                  ) : (
                    detail.snapshots.map((snapshot) => (
                      <tr key={snapshot.id}>
                        <td>{snapshot.periodLabel}</td>
                        <td>{compactNumber(snapshot.householdsServed)}</td>
                        <td>{compactNumber(snapshot.householdsTarget)}</td>
                        <td>{percent(snapshot.deliveryPct)}</td>
                        <td>{snapshot.staffingCapacityPct}%</td>
                        <td>{compactNumber(snapshot.backlogCount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Delivery by month">
              <Table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Served</th>
                    <th>Target</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {program.monthlyTrend.map((item) => {
                    const progress = Math.round((item.served / item.target) * 100);
                    return (
                      <tr key={item.month}>
                        <td>{item.month}</td>
                        <td>{compactNumber(item.served)}</td>
                        <td>{compactNumber(item.target)}</td>
                        <td>
                          {percent(progress)}
                          <Progress value={progress} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Panel>

            <Panel
              title="Program controls"
              actions={
                canAdmin ? (
                  <button type="button" className="secondary" disabled={isBusy} onClick={handleDeleteProgram}>
                    Archive program
                  </button>
                ) : null
              }
            >
              <form className="action-form" onSubmit={handleSaveProgram}>
                <label>
                  Owner
                  <input
                    value={programForm.owner}
                    onChange={(event) => setProgramForm({ ...programForm, owner: event.target.value })}
                    aria-invalid={Boolean(programErrors.owner)}
                    disabled={!canOperate}
                  />
                  <FieldMessage>{programErrors.owner}</FieldMessage>
                </label>
                <label>
                  Executive sponsor
                  <input
                    value={programForm.executiveSponsor}
                    onChange={(event) => setProgramForm({ ...programForm, executiveSponsor: event.target.value })}
                    aria-invalid={Boolean(programErrors.executiveSponsor)}
                    disabled={!canOperate}
                  />
                  <FieldMessage>{programErrors.executiveSponsor}</FieldMessage>
                </label>
                <label>
                  Status
                  <select
                    value={programForm.status}
                    onChange={(event) => setProgramForm({ ...programForm, status: event.target.value })}
                    disabled={!canOperate}
                  >
                    <option value="active">Active</option>
                    <option value="monitor">Monitor</option>
                  </select>
                </label>
                <label>
                  Households target
                  <input
                    type="number"
                    min="0"
                    value={programForm.householdsTarget}
                    onChange={(event) => setProgramForm({ ...programForm, householdsTarget: event.target.value })}
                    aria-invalid={Boolean(programErrors.householdsTarget)}
                    disabled={!canOperate}
                  />
                  <FieldMessage>{programErrors.householdsTarget}</FieldMessage>
                </label>
                <label>
                  Staffing capacity %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={programForm.staffingCapacityPct}
                    onChange={(event) => setProgramForm({ ...programForm, staffingCapacityPct: event.target.value })}
                    aria-invalid={Boolean(programErrors.staffingCapacityPct)}
                    disabled={!canOperate}
                  />
                  <FieldMessage>{programErrors.staffingCapacityPct}</FieldMessage>
                </label>
                <label>
                  Backlog
                  <input
                    type="number"
                    min="0"
                    value={programForm.backlogCount}
                    onChange={(event) => setProgramForm({ ...programForm, backlogCount: event.target.value })}
                    aria-invalid={Boolean(programErrors.backlogCount)}
                    disabled={!canOperate}
                  />
                  <FieldMessage>{programErrors.backlogCount}</FieldMessage>
                </label>
                <label>
                  Compliance score
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={programForm.complianceScore}
                    onChange={(event) => setProgramForm({ ...programForm, complianceScore: event.target.value })}
                    aria-invalid={Boolean(programErrors.complianceScore)}
                    disabled={!canOperate}
                  />
                  <FieldMessage>{programErrors.complianceScore}</FieldMessage>
                </label>
                <label>
                  Data freshness hours
                  <input
                    type="number"
                    min="0"
                    value={programForm.dataFreshnessHours}
                    onChange={(event) => setProgramForm({ ...programForm, dataFreshnessHours: event.target.value })}
                    aria-invalid={Boolean(programErrors.dataFreshnessHours)}
                    disabled={!canOperate}
                  />
                  <FieldMessage>{programErrors.dataFreshnessHours}</FieldMessage>
                </label>
                {canOperate ? (
                  <div className="button-row span-two">
                    <button type="submit" disabled={isBusy || hasProgramErrors}>
                      {isBusy ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                ) : null}
              </form>
            </Panel>

            <Panel title="Tracked follow-up" className="wide">
              <form className="action-form" onSubmit={handleCreateAction}>
                <label className="span-two">
                  Action
                  <input
                    value={actionForm.title}
                    onChange={(event) => setActionForm({ ...actionForm, title: event.target.value })}
                    placeholder="Describe the follow-up action"
                    aria-invalid={Boolean(actionErrors.title)}
                    disabled={!canOperate}
                  />
                  <FieldMessage>{actionErrors.title}</FieldMessage>
                </label>
                <label>
                  Owner
                  <input
                    value={actionForm.owner}
                    onChange={(event) => setActionForm({ ...actionForm, owner: event.target.value })}
                    placeholder="Owner"
                    aria-invalid={Boolean(actionErrors.owner)}
                    disabled={!canOperate}
                  />
                  <FieldMessage>{actionErrors.owner}</FieldMessage>
                </label>
                <label>
                  Due
                  <input
                    type="date"
                    value={actionForm.due}
                    onChange={(event) => setActionForm({ ...actionForm, due: event.target.value })}
                    aria-invalid={Boolean(actionErrors.due)}
                    disabled={!canOperate}
                  />
                  <FieldMessage tone={actionErrors.due ? "warning" : "error"}>{actionErrors.due}</FieldMessage>
                </label>
                <label className="span-two">
                  Context
                  <textarea
                    value={actionForm.reason}
                    onChange={(event) => setActionForm({ ...actionForm, reason: event.target.value })}
                    placeholder="Why this action matters"
                    disabled={!canOperate}
                  />
                </label>
                {canOperate ? (
                  <div className="button-row span-two">
                    <button type="submit" disabled={isBusy || hasActionErrors}>
                      {isBusy ? "Saving..." : "Add action"}
                    </button>
                  </div>
                ) : null}
              </form>
              <Table>
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Action</th>
                    <th>Owner</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {detail.trackedActions.length === 0 ? (
                    <tr><td colSpan="6">No tracked follow-up actions yet. Add one above.</td></tr>
                  ) : (
                    detail.trackedActions.map((action) => (
                      <tr key={action.id}>
                        <td>{action.priority || "--"}</td>
                        <td>
                          <strong>{action.title}</strong>
                          <span className="subline">{action.reason || "Operational follow-up item"}</span>
                        </td>
                        <td>{action.owner}</td>
                        <td>
                          {formatDate(action.due)}
                          {isOverdue(action.due) && action.status !== "done" ? <span className="subline tone-danger">Overdue</span> : null}
                        </td>
                        <td><Status value={action.status} /></td>
                        <td>
                          {canOperate ? (
                            <div className="row-actions">
                              {action.status !== "in-progress" ? (
                                <button type="button" className="secondary table-button" disabled={isBusy} onClick={() => handleActionStatus(action.id, "in-progress")}>
                                  Mark in progress
                                </button>
                              ) : null}
                              {action.status !== "done" ? (
                                <button type="button" className="secondary table-button" disabled={isBusy} onClick={() => handleActionStatus(action.id, "done")}>
                                  Mark complete
                                </button>
                              ) : null}
                              {action.status !== "open" ? (
                                <button type="button" className="secondary table-button" disabled={isBusy} onClick={() => handleActionStatus(action.id, "open")}>
                                  Reopen action
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Program alerts" className="wide">
              <Table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Alert</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {detail.alerts.length === 0 ? (
                    <tr><td colSpan="4">No alerts for this program.</td></tr>
                  ) : (
                    detail.alerts.map((alert) => (
                      <tr key={alert.id}>
                        <td><Status value={alert.severity} /></td>
                        <td>
                          <strong>{alert.title}</strong>
                          <span className="subline">{alert.detail}</span>
                        </td>
                        <td><Status value={alert.status} /></td>
                        <td>
                          {(canOperate || canAdmin) ? (
                            <div className="row-actions">
                              {canOperate && alert.status === "open" ? (
                                <button type="button" className="secondary table-button" disabled={isBusy} onClick={() => handleAlertStatus(alert.id, "acknowledged")}>
                                  Acknowledge alert
                                </button>
                              ) : null}
                              {canOperate && alert.status !== "resolved" ? (
                                <button type="button" className="secondary table-button" disabled={isBusy} onClick={() => handleAlertStatus(alert.id, "resolved")}>
                                  Resolve alert
                                </button>
                              ) : null}
                              {canAdmin ? (
                                <button type="button" className="secondary table-button" disabled={isBusy} onClick={() => handleDeleteAlert(alert.id)}>
                                  Archive alert
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Open issues" className="wide">
              <Table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Category</th>
                    <th>Exception</th>
                    <th>Current</th>
                    <th>Threshold</th>
                    <th>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.anomalies.length === 0 ? (
                    <tr><td colSpan="6">No anomalies detected for this program.</td></tr>
                  ) : (
                    detail.anomalies.map((anomaly) => (
                      <tr key={anomaly.id}>
                        <td><Status value={anomaly.severity} /></td>
                        <td>{anomaly.category}</td>
                        <td>{anomaly.title}</td>
                        <td>{anomaly.currentValue}</td>
                        <td>{anomaly.threshold}</td>
                        <td>{anomaly.recommendation}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Data">
              <Table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Latest sync</th>
                    <th>Freshness</th>
                    <th>Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.dataSources.map((source) => (
                    <tr key={source.id}>
                      <td>{source.name}</td>
                      <td><Status value={source.syncHealth ?? source.status} /></td>
                      <td>{source.latestSyncRun ? formatDateTime(source.latestSyncRun.startedAt) : formatDateTime(source.lastSyncAt)}</td>
                      <td>{source.freshnessHours}h</td>
                      <td>{source.qualityScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Recent sync activity">
              <Table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.syncHistory.length === 0 ? (
                    <tr><td colSpan="3">No sync activity recorded yet.</td></tr>
                  ) : (
                    detail.syncHistory.slice(0, 6).map((run) => (
                      <tr key={run.id}>
                        <td><Status value={run.status} /></td>
                        <td>{formatDateTime(run.startedAt)}</td>
                        <td>
                          {run.status === "failed" ? `${run.errorCount} validation issues` : `${run.processedProgramCount} programs processed`}
                          {run.errors?.[0] ? <span className="subline">{run.errors[0]}</span> : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Audit trail" className="wide">
              <Table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Who</th>
                    <th>Action</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.auditTrail.length === 0 ? (
                    <tr><td colSpan="4">No audit events recorded yet.</td></tr>
                  ) : (
                    detail.auditTrail.map((event) => (
                      <tr key={event.id}>
                        <td>{formatDateTime(event.createdAt)}</td>
                        <td>{event.actorName ?? event.actorId ?? "System"}<span className="subline">{event.actorRole ?? "system"}</span></td>
                        <td>{event.action}</td>
                        <td>{event.detail}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Recommended next steps">
              <Table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Owner</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recommendedActions.map((action) => (
                    <tr key={action.id}>
                      <td>
                        <strong>{action.title}</strong>
                        <span className="subline">{action.reason}</span>
                      </td>
                      <td>{action.owner}</td>
                      <td>{action.due}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
