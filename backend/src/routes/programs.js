import express from "express";
import { requireCsrf, requireRole } from "../utils/auth.js";
import { asyncRoute, notFound, paginate } from "../utils/http.js";

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

export function createProgramRouter({ programService }) {
  const router = express.Router();

  router.get(
    "/",
    asyncRoute(async (request, response) => {
      const all = await programService.listPrograms();
      const { data, pagination } = paginate(all, request.query);
      response.json({ programs: data, pagination });
    })
  );

  router.get(
    "/export/csv",
    asyncRoute(async (_request, response) => {
      const programs = await programService.listPrograms();
      const rows = [
        [
          "id",
          "name",
          "status",
          "partner",
          "owner",
          "delivery_pct",
          "health_status",
          "projected_delivery_pct",
          "forecast_status"
        ],
        ...programs.map((program) => [
          program.id,
          program.name,
          program.status,
          program.utilityPartner,
          program.owner,
          program.kpis.deliveryPct,
          program.kpis.healthStatus,
          program.forecast.projectedDeliveryPct,
          program.forecast.status
        ])
      ];

      response.setHeader("Content-Type", "text/csv; charset=utf-8");
      response.setHeader("Content-Disposition", 'attachment; filename="program-portfolio.csv"');
      response.send(rows.map((row) => row.map(csvCell).join(",")).join("\n"));
    })
  );

  router.get(
    "/:id",
    asyncRoute(async (request, response) => {
      const detail = await programService.getProgramDetail(request.params.id);
      if (!detail) throw notFound("Program not found");
      response.json(detail);
    })
  );

  router.patch(
    "/:id",
    requireRole("operator"),
    requireCsrf,
    asyncRoute(async (request, response) => {
      const program = await programService.updateProgram(request.params.id, request.body ?? {}, request.auth?.actor);
      if (!program) throw notFound("Program not found");
      response.json({ program });
    })
  );

  router.delete(
    "/:id",
    requireRole("admin"),
    requireCsrf,
    asyncRoute(async (request, response) => {
      const program = await programService.deleteProgram(request.params.id, request.auth?.actor);
      if (!program) throw notFound("Program not found");
      response.json({ deleted: true, id: request.params.id });
    })
  );

  return router;
}
