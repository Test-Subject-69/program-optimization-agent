"use client";

import { useEffect, useMemo, useState } from "react";

import { loadAnomalies, loadPrograms, updateThresholds } from "../../lib/api";
import { programName, severityRank } from "../../lib/format";
import {
  AnimateIn,
  FieldMessage,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  SkeletonStats,
  SkeletonTable,
  Stat,
  StatStrip,
  Status,
  Table,
  TextLink,
  ToastContainer,
  useDebouncedValue,
  useToast
} from "../../components/ui";
import { useSession } from "../../components/session-context";
import { useQueryState } from "../../lib/url-state";

const defaultFilters = {
  q: "",
  severity: "all"
};

function buildThresholdForm(thresholds) {
  return {
    deliveryWarningPct: String(thresholds?.deliveryWarningPct ?? 85),
    staffingTargetPct: String(thresholds?.staffingTargetPct ?? 82),
    openRolesWarning: String(thresholds?.openRolesWarning ?? 10),
    complianceMinimumScore: String(thresholds?.complianceMinimumScore ?? 90),
    dataFreshnessWarningHours: String(thresholds?.dataFreshnessWarningHours ?? 48)
  };
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useQueryState(defaultFilters);
  const [thresholdForm, setThresholdForm] = useState(buildThresholdForm(null));
  const { toast, showToast } = useToast();
  const { role } = useSession();
  const canAdmin = role === "admin";

  async function refresh() {
    const [anomalyData, programData] = await Promise.all([loadAnomalies(), loadPrograms()]);
    setAnomalies(anomalyData);
    setPrograms(programData.programs);
    setThresholdForm(buildThresholdForm(anomalyData.thresholds));
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Unable to load anomalies"));
  }, []);

  const debouncedQ = useDebouncedValue(filters.q);

  const filtered = useMemo(() => {
    if (!anomalies) return [];
    const search = debouncedQ.trim().toLowerCase();
    return anomalies.anomalies
      .filter((anomaly) => {
        const matchesSeverity = filters.severity === "all" || anomaly.severity === filters.severity;
        const matchesSearch =
          !search ||
          [
            anomaly.title,
            anomaly.category,
            anomaly.currentValue,
            anomaly.recommendation,
            programName(programs, anomaly.programId)
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        return matchesSeverity && matchesSearch;
      })
      .sort((left, right) => severityRank(left.severity) - severityRank(right.severity));
  }, [anomalies, debouncedQ, filters.severity, programs]);

  async function handleSaveThresholds(event) {
    event.preventDefault();
    try {
      await updateThresholds({
        deliveryWarningPct: Number(thresholdForm.deliveryWarningPct),
        staffingTargetPct: Number(thresholdForm.staffingTargetPct),
        openRolesWarning: Number(thresholdForm.openRolesWarning),
        complianceMinimumScore: Number(thresholdForm.complianceMinimumScore),
        dataFreshnessWarningHours: Number(thresholdForm.dataFreshnessWarningHours)
      });
      await refresh();
      showToast("success", "Thresholds updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update thresholds");
    }
  }

  const programIssues = filtered.filter((item) => item.category !== "Data").length;
  const dataIssues = filtered.filter((item) => item.category === "Data").length;
  const filtersActive = Object.entries(defaultFilters).some(([key, value]) => filters[key] !== value);

  return (
    <>
      <ToastContainer toast={toast} />
      <PageHeader title="Issues">
        These are the problems that need follow-up across programs and data.
      </PageHeader>
      <Notice>{error}</Notice>

      {!anomalies ? (
        <div className="page-body">
          <div className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 16 }} />
          <SkeletonStats />
          <div className="content-grid" style={{ marginTop: 16 }}>
            <div className="panel wide animate-in"><SkeletonTable rows={4} cols={6} /></div>
          </div>
        </div>
      ) : (
        <div className="page-body">
          <div className="toolbar">
            <label className="toolbar-field toolbar-search">
              <span>Search</span>
              <input
                value={filters.q}
                onChange={(event) => setFilters({ q: event.target.value })}
                placeholder="Program, exception, response"
              />
            </label>
            <label className="toolbar-field">
              <span>Severity</span>
              <select value={filters.severity} onChange={(event) => setFilters({ severity: event.target.value })}>
                <option value="all">All severity</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>
            </label>
            <div className="toolbar-actions">
              <span className="toolbar-meta">{filtered.length} of {anomalies.anomalies.length} exceptions</span>
              <button type="button" className="secondary" onClick={() => setFilters(defaultFilters)} disabled={!filtersActive}>
                Clear filters
              </button>
            </div>
          </div>

          <AnimateIn>
            <StatStrip>
              <Stat label="Open issues" value={filtered.length} help={`${anomalies.anomalies.length} total detected`} />
              <Stat label="High priority" value={filtered.filter((item) => item.severity === "high").length} help="Needs faster follow-up" />
              <Stat label="Program issues" value={programIssues} help="Delivery, staffing, equity, or compliance" />
              <Stat label="Data issues" value={dataIssues} help="Stale or low-quality data feeds" />
            </StatStrip>
          </AnimateIn>

          <div className="content-grid">
            <Panel title="Exceptions" className="wide">
              <Table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Program</th>
                    <th>Issue</th>
                    <th>Current state</th>
                    <th>Next step</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="6">No issues match your filters. Try adjusting or clearing them.</td></tr>
                  ) : (
                    filtered.map((anomaly) => (
                      <tr key={anomaly.id}>
                        <td><Status value={anomaly.severity} /></td>
                        <td>{programName(programs, anomaly.programId)}</td>
                        <td>
                          <strong>{anomaly.title}</strong>
                          <span className="subline">{anomaly.category}</span>
                        </td>
                        <td>{anomaly.currentValue}</td>
                        <td>{anomaly.recommendation}</td>
                        <td>{anomaly.programId ? <TextLink href={`/programs/${anomaly.programId}`}>Open</TextLink> : ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Thresholds">
              <form className="form-grid" onSubmit={handleSaveThresholds}>
                <label>
                  Delivery warning %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={thresholdForm.deliveryWarningPct}
                    onChange={(event) => setThresholdForm({ ...thresholdForm, deliveryWarningPct: event.target.value })}
                    disabled={!canAdmin}
                  />
                </label>
                <label>
                  Staffing target %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={thresholdForm.staffingTargetPct}
                    onChange={(event) => setThresholdForm({ ...thresholdForm, staffingTargetPct: event.target.value })}
                    disabled={!canAdmin}
                  />
                </label>
                <label>
                  Open roles warning
                  <input
                    type="number"
                    min="0"
                    value={thresholdForm.openRolesWarning}
                    onChange={(event) => setThresholdForm({ ...thresholdForm, openRolesWarning: event.target.value })}
                    disabled={!canAdmin}
                  />
                </label>
                <label>
                  Compliance minimum
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={thresholdForm.complianceMinimumScore}
                    onChange={(event) => setThresholdForm({ ...thresholdForm, complianceMinimumScore: event.target.value })}
                    disabled={!canAdmin}
                  />
                </label>
                <label className="span-two">
                  Data freshness warning hours
                  <input
                    type="number"
                    min="0"
                    value={thresholdForm.dataFreshnessWarningHours}
                    onChange={(event) => setThresholdForm({ ...thresholdForm, dataFreshnessWarningHours: event.target.value })}
                    disabled={!canAdmin}
                  />
                  <FieldMessage tone="warning">
                    Threshold updates are admin-only and affect anomaly detection immediately.
                  </FieldMessage>
                </label>
                {canAdmin ? (
                  <div className="button-row span-two">
                    <button type="submit">Save thresholds</button>
                  </div>
                ) : null}
              </form>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
