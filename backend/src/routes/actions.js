import express from "express";

import { requireCsrf, requireRole } from "../utils/auth.js";
import { asyncRoute, notFound, paginate } from "../utils/http.js";

export function createActionRouter({ programService }) {
  const router = express.Router();

  router.get(
    "/",
    asyncRoute(async (request, response) => {
      const all = await programService.listTrackedActions({
        status: request.query.status,
        programId: request.query.programId,
        alertId: request.query.alertId
      });
      const { data, pagination } = paginate(all, request.query);
      response.json({ actions: data, pagination });
    })
  );

  router.post(
    "/",
    requireRole("operator"),
    requireCsrf,
    asyncRoute(async (request, response) => {
      const action = await programService.saveTrackedAction(request.body ?? {}, request.auth?.actor);
      response.status(201).json({ action });
    })
  );

  router.patch(
    "/:id",
    requireRole("operator"),
    requireCsrf,
    asyncRoute(async (request, response) => {
      const existing = await programService.getTrackedAction(request.params.id);
      if (!existing) throw notFound("Tracked action not found");
      const action = await programService.saveTrackedAction({
        ...existing,
        ...(request.body ?? {}),
        id: request.params.id
      }, request.auth?.actor);
      response.json({ action });
    })
  );

  router.delete(
    "/:id",
    requireRole("admin"),
    requireCsrf,
    asyncRoute(async (request, response) => {
      const existing = await programService.getTrackedAction(request.params.id);
      if (!existing) throw notFound("Tracked action not found");
      await programService.deleteTrackedAction(request.params.id, request.auth?.actor);
      response.json({ deleted: true, id: request.params.id });
    })
  );

  return router;
}
