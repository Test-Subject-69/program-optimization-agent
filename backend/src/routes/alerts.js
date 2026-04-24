import express from "express";

import { requireCsrf, requireRole } from "../utils/auth.js";
import { asyncRoute, notFound, paginate } from "../utils/http.js";

export function createAlertRouter({ programService }) {
  const router = express.Router();

  router.get(
    "/",
    asyncRoute(async (request, response) => {
      const all = await programService.listAlerts({
        status: request.query.status,
        severity: request.query.severity,
        programId: request.query.programId
      });
      const { data, pagination } = paginate(all, request.query);
      response.json({ alerts: data, pagination });
    })
  );

  router.post(
    "/",
    requireRole("operator"),
    requireCsrf,
    asyncRoute(async (request, response) => {
      const alert = await programService.saveAlert(request.body ?? {}, request.auth?.actor);
      response.status(201).json({ alert });
    })
  );

  router.patch(
    "/:id",
    requireRole("operator"),
    requireCsrf,
    asyncRoute(async (request, response) => {
      const existing = await programService.getAlert(request.params.id);
      if (!existing) throw notFound("Alert not found");
      const alert = await programService.saveAlert({
        ...existing,
        ...(request.body ?? {}),
        id: request.params.id
      }, request.auth?.actor);
      response.json({ alert });
    })
  );

  router.delete(
    "/:id",
    requireRole("admin"),
    requireCsrf,
    asyncRoute(async (request, response) => {
      const existing = await programService.getAlert(request.params.id, { includeDeleted: true });
      if (!existing) throw notFound("Alert not found");
      await programService.deleteAlert(request.params.id, request.auth?.actor);
      response.json({ deleted: true, id: request.params.id });
    })
  );

  return router;
}
