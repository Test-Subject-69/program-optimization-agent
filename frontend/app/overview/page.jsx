"use client";

import { useEffect, useMemo, useState } from "react";
import { loadDashboard, resetSamples } from "../../lib/api";
import { compactNumber, formatDate, formatDateTime, isOverdue, percent, programName } from "../../lib/format";
import { AnimateIn, ButtonLink, EmptyState, LoadingState, Notice, PageHeader, Panel, Progress, Skeleton, SkeletonStats, SkeletonTable, Stat, StatStrip, Status, Table, TextLink, ToastContainer, useToast } from "../../components/ui";
import { useSession } from "../../components/session-context";
import { InsightBanner } from "../../components/insight-banner";

export default function OverviewPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { toast, showToast } = useToast();
  const { role } = useSession();
  const canAdmin = role === "admin";

  async function refresh() {
    setError("");
    setDashboard(await loadDashboard());
    setLastUpdated(new Date());
  }

  async function handleReset() {
    setIsBusy(true);
    try {
      await resetSamples();
      await refresh();
      showToast("success", "Demo data reset successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset sample data");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Unable to load dashboard"));
  }, []);

  const trackedActions = dashboard?.trackedActions ?? [];
  const overdueActions = useMemo(
    () => trackedActions.filter((action) => isOverdue(action.due)),
    [trackedActions]
  );
  const programsNeedingAttention = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.programs
      .slice()
      .sort((a, b) => a.kpis.healthScore - b.kpis.healthScore)
      .slice(0, 5);
  }, [dashboard]);

  return (
    <>
      <ToastContainer toast={toast} />
      <PageHeader
        title="Overview"
        actions={
          <div className="header-actions">
            {lastUpdated ? <span className="updated-at">Updated {lastUpdated.toLocaleTimeString()}</span> : null}
            {canAdmin ? (
              <button type="button" className="secondary" onClick={handleReset} disabled={isBusy}>{isBusy ? "Resetting..." : "Reset demo data"}</button>
            ) : null}
          </div>
        }
      >
        A quick summary of how the portfolio is doing, what is going wrong, and what needs attention next.
      </PageHeader>
      <Notice>{error}</Notice>

      {!dashboard ? (
        <div className="page-body">
          <SkeletonStats />
          <div className="content-grid">
            <div className="panel wide animate-in"><SkeletonTable rows={3} cols={6} /></div>
            <div className="panel wide animate-in"><SkeletonTable rows={3} cols={5} /></div>
          </div>
        </div>
      ) : (
        <div className="page-body">
          <InsightBanner />
          <AnimateIn>
            <StatStrip>
              <Stat label="Programs" value={dashboard.summary.programCount} help={`${dashboard.summary.atRiskProgramCount} need attention`} />
              <Stat
                label="Open alerts"
                value={dashboard.alerts.length}
                help={`${dashboard.alerts.filter((item) => item.severity === "high").length} high priority`}
              />
              <Stat label="Tracked actions" value={trackedActions.length} help={`${overdueActions.length} overdue`} />
              <Stat label="Degraded sources" value={dashboard.degradedSources.length} help={`${dashboard.syncRuns.filter((run) => run.status === "failed").length} failed syncs`} />
            </StatStrip>
          </AnimateIn>

          <div className="content-grid">
            <Panel title="Follow-up queue" className="wide" actions={<ButtonLink href="/data-sources" className="secondary">View data quality</ButtonLink>}>
              <Table>
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Program</th>
                    <th>Action</th>
                    <th>Owner</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trackedActions.length === 0 ? (
                    dashboard.recommendedActions.map((action) => (
                      <tr key={action.id}>
                        <td>{action.priority}</td>
                        <td>{programName(dashboard.programs, action.programId)}</td>
                        <td>
                          <strong>{action.title}</strong>
                          <span className="subline">{action.reason}</span>
                        </td>
                        <td>{action.owner}</td>
                        <td>{action.due}</td>
                        <td><Status value="open" /></td>
                      </tr>
                    ))
                  ) : (
                    trackedActions.map((action) => (
                      <tr key={action.id}>
                        <td>{action.priority || "--"}</td>
                        <td>{programName(dashboard.programs, action.programId)}</td>
                        <td>
                          <strong>{action.title}</strong>
                          <span className="subline">{action.reason || "Operational follow-up item"}</span>
                        </td>
                        <td>{action.owner}</td>
                        <td>
                          {formatDate(action.due)}
                          {isOverdue(action.due) ? <span className="subline tone-danger">Overdue</span> : null}
                        </td>
                        <td><Status value={action.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Unresolved alerts" className="wide" actions={<ButtonLink href="/anomalies" className="secondary">View all issues</ButtonLink>}>
              <Table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Program</th>
                    <th>Alert</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.alerts.length === 0 ? (
                    <tr><td colSpan="5">No unresolved alerts right now.</td></tr>
                  ) : (
                    dashboard.alerts.map((alert) => (
                      <tr key={alert.id}>
                        <td><Status value={alert.severity} /></td>
                        <td>{programName(dashboard.programs, alert.programId)}</td>
                        <td>
                          <strong>{alert.title}</strong>
                          <span className="subline">{alert.detail}</span>
                        </td>
                        <td><Status value={alert.status} /></td>
                        <td>{alert.programId ? <TextLink href={`/programs/${alert.programId}`}>Open</TextLink> : ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Programs that need attention" className="wide" actions={<ButtonLink href="/programs" className="secondary">View all programs</ButtonLink>}>
              <Table>
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Health</th>
                    <th>Delivery</th>
                    <th>Staffing</th>
                    <th>Follow-up</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {programsNeedingAttention.map((program) => (
                      <tr key={program.id}>
                        <td>
                          <strong>{program.name}</strong>
                          <span className="subline">{program.utilityPartner} - {program.owner}</span>
                        </td>
                        <td><Status value={program.kpis.healthStatus} /></td>
                        <td>
                          {percent(program.kpis.deliveryPct)}
                          <Progress value={program.kpis.deliveryPct} />
                        </td>
                        <td>{program.metrics.staffingCapacityPct}% staffed, {program.metrics.openRoles} open</td>
                        <td>
                          {dashboard.trackedActions.filter((action) => action.programId === program.id).length} tracked
                          <span className="subline">{dashboard.alerts.filter((alert) => alert.programId === program.id).length} alerts</span>
                        </td>
                        <td><TextLink href={`/programs/${program.id}`}>Open</TextLink></td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Data sources that need attention" className="wide">
              <Table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Health</th>
                    <th>Latest sync</th>
                    <th>Quality</th>
                    <th>Programs</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.degradedSources.length === 0 ? (
                    <tr><td colSpan="5">All tracked data sources are currently healthy.</td></tr>
                  ) : (
                    dashboard.degradedSources.map((source) => (
                    <tr key={source.id}>
                      <td>
                        <strong>{source.name}</strong>
                        <span className="subline">{source.sourceType} - {source.owner}</span>
                      </td>
                      <td><Status value={source.syncHealth} /></td>
                      <td>
                        {source.latestSyncRun ? formatDateTime(source.latestSyncRun.startedAt) : formatDateTime(source.lastSyncAt)}
                        <span className="subline">
                          {source.latestSyncRun?.status === "failed"
                            ? `${source.latestSyncRun.errorCount} validation issues`
                            : `${source.freshnessHours}h freshness`}
                        </span>
                      </td>
                      <td>{source.qualityScore}%</td>
                      <td>{source.programIds.map((id) => programName(dashboard.programs, id)).join(", ")}</td>
                    </tr>
                  ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Recent sync activity">
              {dashboard.syncRuns.length === 0 ? (
                <EmptyState>No import activity recorded yet.</EmptyState>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Started</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.syncRuns.slice(0, 6).map((run) => (
                      <tr key={run.id}>
                        <td><Status value={run.status} /></td>
                        <td>{run.dataSourceName}</td>
                        <td>{formatDateTime(run.startedAt)}</td>
                        <td>
                          {run.status === "failed" ? `${run.errorCount} validation issues` : `${run.processedProgramCount} programs processed`}
                          {run.errors?.[0] ? <span className="subline">{run.errors[0]}</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>

            <Panel title="Portfolio readout">
              <div className="detail-list">
                <div>
                  <span>Delivery</span>
                  <strong>{percent(dashboard.summary.deliveryPct)} of target, {compactNumber(dashboard.summary.householdsServed)} households served</strong>
                  <span className="subline">{dashboard.summary.deliveryTrendDirection} {dashboard.summary.monthOverMonthDeliveryDelta >= 0 ? "+" : ""}{dashboard.summary.monthOverMonthDeliveryDelta} points month over month</span>
                </div>
                <div>
                  <span>Capacity</span>
                  <strong>{dashboard.summary.openRoles} open roles and {compactNumber(dashboard.summary.backlogCount)} backlog items</strong>
                </div>
                <div>
                  <span>Forecast</span>
                  <strong>{percent(dashboard.summary.forecastDeliveryPct)} projected delivery</strong>
                  <span className="subline">{dashboard.summary.forecastOnTrackCount} programs on track, {dashboard.summary.forecastAtRiskCount} off track</span>
                </div>
                <div>
                  <span>Sync pressure</span>
                  <strong>{dashboard.degradedSources.length} sources need refresh or review</strong>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
