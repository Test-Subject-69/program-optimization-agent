"use client";

import { useEffect, useMemo, useState } from "react";

import { downloadReportPdf, generateReport, loadDashboard, loadReports } from "../../lib/api";
import {
  AnimateIn,
  EmptyState,
  FieldMessage,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  Skeleton,
  SkeletonTable,
  Table,
  ToastContainer,
  useToast
} from "../../components/ui";
import { money } from "../../lib/format";
import { useSession } from "../../components/session-context";

export default function ReportsPage() {
  const [reports, setReports] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [form, setForm] = useState({
    focus: "executive-weekly",
    audience: "Executive leadership",
    includeActions: true
  });
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const { toast, showToast } = useToast();
  const { role } = useSession();

  const formErrors = useMemo(
    () => ({
      audience: form.audience.trim() ? "" : "Audience is required."
    }),
    [form.audience]
  );

  async function refresh() {
    const data = await loadReports();
    setReports(data.reports);
    setCurrentReport((current) => current ?? data.reports[0] ?? null);
  }

  async function handleGenerate() {
    if (formErrors.audience) return;
    setIsBusy(true);
    setError("");
    try {
      const data = await generateReport(form);
      setCurrentReport(data.report);
      await refresh();
      showToast("success", "Report generated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate report");
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePdfExport() {
    if (!currentReport) return;
    try {
      await downloadReportPdf(currentReport.id);
      showToast("success", "PDF export ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export PDF");
    }
  }

  useEffect(() => {
    Promise.all([
      refresh(),
      loadDashboard().then(setDashboard)
    ]).catch((err) => setError(err instanceof Error ? err.message : "Unable to load reports"));
  }, []);

  return (
    <>
      <ToastContainer toast={toast} />
      <PageHeader title="Executive brief">
        Turn the current portfolio into a short summary for leadership.
      </PageHeader>
      <Notice>{error}</Notice>

      {!reports ? (
        <div className="page-body">
          <div className="content-grid">
            <div className="panel animate-in">
              <div style={{ padding: 16 }}>
                <Skeleton style={{ height: 20, width: '40%', marginBottom: 12 }} />
                <Skeleton style={{ height: 36, width: '100%', marginBottom: 12 }} />
                <Skeleton style={{ height: 36, width: '100%' }} />
              </div>
            </div>
            <div className="panel animate-in">
              <div style={{ padding: 16 }}>
                <Skeleton style={{ height: 16, width: '30%', marginBottom: 12 }} />
                <Skeleton style={{ height: 80, width: '100%' }} />
              </div>
            </div>
            <div className="panel wide animate-in"><SkeletonTable rows={3} cols={5} /></div>
          </div>
        </div>
      ) : (
        <div className="page-body">
          <div className="content-grid">
            <Panel title="Generate brief">
              <div className="form-grid">
                <label>
                  Focus
                  <select value={form.focus} onChange={(event) => setForm({ ...form, focus: event.target.value })}>
                    <option value="executive-weekly">Executive weekly</option>
                    <option value="board-readout">Board readout</option>
                    <option value="capacity-review">Capacity review</option>
                    <option value="partner-review">Partner review</option>
                  </select>
                </label>
                <label>
                  Audience
                  <input
                    value={form.audience}
                    onChange={(event) => setForm({ ...form, audience: event.target.value })}
                    aria-invalid={Boolean(formErrors.audience)}
                  />
                  <FieldMessage>{formErrors.audience}</FieldMessage>
                </label>
                <label className="span-two">
                  Include action recommendations
                  <select
                    value={form.includeActions ? "yes" : "no"}
                    onChange={(event) => setForm({ ...form, includeActions: event.target.value === "yes" })}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <div className="span-two" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button type="button" onClick={handleGenerate} disabled={isBusy || Boolean(formErrors.audience)}>
                    {isBusy ? "Generating brief..." : "Generate brief"}
                  </button>
                </div>
              </div>
              {!dashboard ? null : (
                <div className="panel-note">
                  Based on {dashboard.summary.programCount} programs, {dashboard.anomalies.length} open issues, {dashboard.summary.openRoles} open roles,
                  and {money(dashboard.summary.revenueYtd)} in revenue YTD.
                </div>
              )}
            </Panel>

            <div id="current-brief">
            <Panel title="Current brief" actions={currentReport ? <button type="button" className="secondary table-button" onClick={handlePdfExport}>Export as PDF</button> : null}>
              {!currentReport ? (
                <EmptyState title="No brief generated yet">Use the form on the left to generate your first executive brief.</EmptyState>
              ) : (
                <div className="brief-body">{currentReport.summary}</div>
              )}
            </Panel>
            </div>

            <Panel title="Saved briefs" className="wide">
              <Table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Focus</th>
                    <th>Audience</th>
                    <th>Mode</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr><td colSpan="5">Generate a brief to see it here.</td></tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report.id}>
                        <td>
                          <span
                            role="button"
                            tabIndex={0}
                            className="text-link"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setCurrentReport(report);
                              downloadReportPdf(report.id).then(() => showToast("success", "PDF exported")).catch(() => setError("Unable to export PDF"));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setCurrentReport(report);
                                downloadReportPdf(report.id).then(() => showToast("success", "PDF exported")).catch(() => setError("Unable to export PDF"));
                              }
                            }}
                          >
                            {report.title}
                          </span>
                        </td>
                        <td>{report.focus}</td>
                        <td>{report.audience}</td>
                        <td>{report.mode}</td>
                        <td>{new Date(report.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
