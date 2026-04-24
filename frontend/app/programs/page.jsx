"use client";

import { useEffect, useMemo, useState } from "react";

import { deleteProgram, downloadProgramsCsv, loadPrograms } from "../../lib/api";
import { compactNumber, money, percent } from "../../lib/format";
import {
  AnimateIn,
  ButtonLink,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  Progress,
  Stat,
  SkeletonStats,
  SkeletonTable,
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
  health: "all",
  sort: "health"
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useQueryState(defaultFilters);
  const { toast, showToast } = useToast();
  const { role } = useSession();
  const canAdmin = role === "admin";

  async function refresh() {
    const data = await loadPrograms();
    setPrograms(data.programs);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Unable to load programs"));
  }, []);

  const debouncedQ = useDebouncedValue(filters.q);

  const filteredPrograms = useMemo(() => {
    if (!programs) return [];
    const search = debouncedQ.trim().toLowerCase();

    const nextPrograms = programs.filter((program) => {
      const matchesSearch =
        !search ||
        [
          program.name,
          program.utilityPartner,
          program.owner,
          program.executiveSponsor,
          program.programType,
          program.state
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));

      const matchesHealth = filters.health === "all" || program.kpis.healthStatus === filters.health;
      return matchesSearch && matchesHealth;
    });

    nextPrograms.sort((left, right) => {
      switch (filters.sort) {
        case "contract":
          return right.contractValue - left.contractValue;
        case "delivery":
          return left.kpis.deliveryPct - right.kpis.deliveryPct;
        case "forecast":
          return left.forecast.projectedDeliveryPct - right.forecast.projectedDeliveryPct;
        case "name":
          return left.name.localeCompare(right.name);
        case "health":
        default:
          return left.kpis.healthScore - right.kpis.healthScore;
      }
    });

    return nextPrograms;
  }, [debouncedQ, filters.health, filters.sort, programs]);

  async function handleDelete(programId) {
    try {
      await deleteProgram(programId);
      await refresh();
      showToast("success", "Program archived");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive program");
    }
  }

  async function handleCsvExport() {
    try {
      await downloadProgramsCsv();
      showToast("success", "Program CSV exported");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export CSV");
    }
  }

  const filtersActive = Object.entries(defaultFilters).some(([key, value]) => filters[key] !== value);
  const active = filteredPrograms.filter((program) => program.status === "active").length;
  const atRisk = filteredPrograms.filter((program) => program.kpis.healthStatus === "at-risk").length;
  const contractValue = filteredPrograms.reduce((sum, program) => sum + Number(program.contractValue ?? 0), 0);
  const openRoles = filteredPrograms.reduce((sum, program) => sum + Number(program.metrics.openRoles ?? 0), 0);

  return (
    <>
      <ToastContainer toast={toast} />
      <PageHeader
        title="Programs"
        actions={
          <a href="#portfolio-table" className="button-link secondary">
            View portfolio table
          </a>
        }
      >
        Compare programs, update key metrics, and see where delivery forecast is slipping.
      </PageHeader>
      <Notice>{error}</Notice>

      {!programs ? (
        <div className="page-body">
          <div className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 16 }} />
          <SkeletonStats />
          <div className="content-grid" style={{ marginTop: 16 }}>
            <div className="panel wide animate-in"><SkeletonTable rows={5} cols={6} /></div>
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
                placeholder="Program, partner, owner, sponsor"
              />
            </label>
            <label className="toolbar-field">
              <span>Health</span>
              <select value={filters.health} onChange={(event) => setFilters({ health: event.target.value })}>
                <option value="all">All health</option>
                <option value="at-risk">At risk</option>
                <option value="monitor">Monitor</option>
                <option value="healthy">Healthy</option>
              </select>
            </label>
            <label className="toolbar-field">
              <span>Sort</span>
              <select value={filters.sort} onChange={(event) => setFilters({ sort: event.target.value })}>
                <option value="health">Health score</option>
                <option value="delivery">Delivery</option>
                <option value="forecast">Forecast</option>
                <option value="name">Program name</option>
              </select>
            </label>
            <div className="toolbar-actions">
              <span className="toolbar-meta">{filteredPrograms.length} of {programs.length} programs</span>
              <button type="button" className="secondary" onClick={handleCsvExport}>
                Export as CSV
              </button>
              <button type="button" className="secondary" onClick={() => setFilters(defaultFilters)} disabled={!filtersActive}>
                Clear filters
              </button>
            </div>
          </div>

          <AnimateIn>
            <StatStrip>
              <Stat label="Programs" value={filteredPrograms.length} help={`${programs.length} total, ${active} active`} />
              <Stat label="At risk" value={atRisk} help="Health below threshold" />
              <Stat label="Open roles" value={openRoles} help="Capacity signal" />
              <Stat label="Portfolio value" value={money(contractValue)} help="Sample contract value" />
            </StatStrip>
          </AnimateIn>

          <div className="content-grid">
            <Panel title="Portfolio table" className="wide">
              <div id="portfolio-table" />
              <Table>
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Health</th>
                    <th>Delivery</th>
                    <th>Forecast</th>
                    <th>Staffing</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.length === 0 ? (
                    <tr><td colSpan="6">No programs match your filters. Try adjusting or clearing them.</td></tr>
                  ) : (
                    filteredPrograms.map((program) => (
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
                        <td>
                          <strong>{percent(program.forecast.projectedDeliveryPct)}</strong>
                          <span className="subline">{program.forecast.summary}</span>
                        </td>
                        <td>{program.metrics.staffingCapacityPct}% staffed, {compactNumber(program.metrics.backlogCount)} backlog</td>
                        <td>
                          <div className="row-actions">
                            <TextLink href={`/programs/${program.id}`}>Open</TextLink>
                            {canAdmin ? (
                              <button type="button" className="secondary table-button" onClick={() => handleDelete(program.id)}>
                                Archive program
                              </button>
                            ) : null}
                          </div>
                        </td>
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
