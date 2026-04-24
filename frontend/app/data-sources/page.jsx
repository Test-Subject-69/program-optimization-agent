"use client";

import { useEffect, useMemo, useState } from "react";
import { loadDataSources, loadPrograms } from "../../lib/api";
import { formatDateTime, programName } from "../../lib/format";
import { AnimateIn, EmptyState, LoadingState, Notice, PageHeader, Panel, Stat, SkeletonStats, SkeletonTable, StatStrip, Status, Table } from "../../components/ui";
import { useQueryState } from "../../lib/url-state";

const defaultFilters = {
  q: "",
  status: "all"
};

export default function DataSourcesPage() {
  const [data, setData] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useQueryState(defaultFilters);

  useEffect(() => {
    Promise.all([loadDataSources(), loadPrograms()])
      .then(([sourceData, programData]) => {
        setData(sourceData);
        setPrograms(programData.programs);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load data sources"));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const search = filters.q.trim().toLowerCase();
    return data.dataSources.filter((source) => {
      const matchesStatus = filters.status === "all" || source.status === filters.status;
      const matchesSearch =
        !search ||
        [source.name, source.sourceType, source.owner]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      return matchesStatus && matchesSearch;
    });
  }, [data, filters]);

  const staleCount = filtered.filter((source) => source.status === "stale").length;
  const freshCount = filtered.filter((source) => source.status === "fresh").length;
  const failedSyncs = data ? data.syncRuns.filter((run) => run.status === "failed").length : 0;
  const filtersActive = Object.entries(defaultFilters).some(([key, value]) => filters[key] !== value);

  return (
    <>
      <PageHeader title="Data sources">
        Track the health, freshness, and quality of every data feed powering the portfolio.
      </PageHeader>
      <Notice>{error}</Notice>

      {!data ? (
        <div className="page-body">
          <div className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 16 }} />
          <SkeletonStats />
          <div className="content-grid" style={{ marginTop: 16 }}>
            <div className="panel wide animate-in"><SkeletonTable rows={4} cols={6} /></div>
            <div className="panel wide animate-in"><SkeletonTable rows={3} cols={4} /></div>
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
                placeholder="Source name, type, or owner"
              />
            </label>
            <label className="toolbar-field">
              <span>Status</span>
              <select value={filters.status} onChange={(event) => setFilters({ status: event.target.value })}>
                <option value="all">All status</option>
                <option value="stale">Stale</option>
                <option value="fresh">Fresh</option>
              </select>
            </label>
            <div className="toolbar-actions">
              <span className="toolbar-meta">{filtered.length} of {data.dataSources.length} sources</span>
              <button type="button" className="secondary" onClick={() => setFilters(defaultFilters)} disabled={!filtersActive}>
                Clear filters
              </button>
            </div>
          </div>

          <AnimateIn>
            <StatStrip>
              <Stat label="Data sources" value={filtered.length} help={`${data.dataSources.length} total`} />
              <Stat label="Fresh" value={freshCount} help="Up to date" />
              <Stat label="Stale" value={staleCount} help="Needs refresh" />
              <Stat label="Failed syncs" value={failedSyncs} help="Recent import failures" />
            </StatStrip>
          </AnimateIn>

          <div className="content-grid">
            <Panel title="Sources" className="wide">
              <Table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Latest sync</th>
                    <th>Freshness</th>
                    <th>Quality</th>
                    <th>Programs</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="6">No data sources match your filters. Try adjusting or clearing them.</td></tr>
                  ) : (
                    filtered.map((source) => (
                      <tr key={source.id}>
                        <td>
                          <strong>{source.name}</strong>
                          <span className="subline">{source.sourceType} - {source.owner}</span>
                        </td>
                        <td><Status value={source.syncHealth ?? source.status} /></td>
                        <td>{formatDateTime(source.lastSyncAt)}</td>
                        <td>{source.freshnessHours}h</td>
                        <td>{source.qualityScore}%</td>
                        <td>{source.programIds.map((id) => programName(programs, id)).join(", ")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Recent sync activity" className="wide">
              {data.syncRuns.length === 0 ? (
                <EmptyState title="No sync activity">Import activity will appear here once data sources begin syncing.</EmptyState>
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
                    {data.syncRuns.slice(0, 10).map((run) => (
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
          </div>
        </div>
      )}
    </>
  );
}
